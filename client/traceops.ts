import type { Express, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TraceOpsInitOptions {
  /**
   * Base URL of your TraceOps backend.
   * @example 'https://trace-ops.onrender.com'
   * @example 'http://localhost:3000'
   */
  endpoint: string;

  /**
   * Unique identifier for the service being monitored.
   * Use a consistent, slug-style name (e.g. 'payments-api', 'auth-service').
   */
  serviceName: string;

  /**
   * Optional API key for authenticated TraceOps backends.
   * Set TRACEOPS_API_KEY on the backend and pass the same value here.
   * Sent as the `x-api-key` request header on every event.
   */
  apiKey?: string;
}

interface EventPayload {
  eventType: 'DEPLOY' | 'CONFIG_CHANGE' | 'ERROR';
  serviceName: string;
  timestamp?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

class TraceOpsSDK {
  private endpoint!: string;
  private serviceName!: string;
  private apiKey: string | undefined;
  private initialized = false;

  private configHashPath: string;
  private previousConfigHash: string | null = null;

  constructor() {
    const baseDir = (() => {
      try {
        return process.cwd();
      } catch {
        return os.tmpdir();
      }
    })();

    this.configHashPath = path.join(baseDir, '.traceops-config-hash');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  init(options: TraceOpsInitOptions): void {
    if (this.initialized) return;

    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.serviceName = options.serviceName;
    this.apiKey = options.apiKey;

    this.loadPreviousConfigHash();
    this.setupErrorHandlers();

    void this.detectConfigChange();
    void this.captureDeploy();

    this.initialized = true;
  }

  /**
   * Attach TraceOps error-capture middleware to an Express app.
   * Call this AFTER defining all your routes so it catches unhandled errors.
   */
  express(app: Express): void {
    if (!this.initialized) {
      throw new Error('TraceOps.init() must be called before TraceOps.express()');
    }

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      void this.captureError(err, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode || 500,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });

      next(err);
    });
  }

  /**
   * Manually capture an error event.
   * Use this for errors caught in try/catch blocks or async code.
   *
   * @example
   * try {
   *   await processPayment();
   * } catch (err) {
   *   TraceOps.captureError(err, { orderId: '123', userId: 'u_456' });
   *   throw err;
   * }
   */
  async captureError(
    error: Error | unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    await this.sendEvent({
      eventType: 'ERROR',
      serviceName: this.serviceName,
      message: err.message || 'Unknown error',
      metadata: {
        name: err.name,
        stack: err.stack,
        ...metadata,
      },
    });
  }

  /**
   * Manually signal a configuration change event.
   * Call this after changing environment variables, feature flags, or
   * any runtime configuration that could affect service behaviour.
   *
   * @example
   * await updateFeatureFlag('dark-mode', true);
   * TraceOps.configChange('Feature flag updated: dark-mode=true', { flag: 'dark-mode', value: true });
   */
  async configChange(
    message?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.sendEvent({
      eventType: 'CONFIG_CHANGE',
      serviceName: this.serviceName,
      message: message || 'Configuration changed',
      metadata,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private setupErrorHandlers(): void {
    process.on('uncaughtException', error => {
      void this.captureError(error, { type: 'uncaughtException' });
    });

    process.on('unhandledRejection', reason => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      void this.captureError(error, { type: 'unhandledRejection' });
    });
  }

  private async captureDeploy(): Promise<void> {
    const metadata: Record<string, unknown> = {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
    };

    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.version) metadata.version = pkg.version;
        if (pkg.name) metadata.servicePkg = pkg.name;
      }
    } catch {
      // ignore
    }

    await this.sendEvent({
      eventType: 'DEPLOY',
      serviceName: this.serviceName,
      message: 'Process started',
      metadata,
    });
  }

  private async detectConfigChange(): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const normalizedEnv = fs
      .readFileSync(envPath, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .sort()
      .join('\n');

    const hash = crypto
      .createHash('sha256')
      .update(normalizedEnv)
      .digest('hex');

    if (this.previousConfigHash && this.previousConfigHash !== hash) {
      await this.sendEvent({
        eventType: 'CONFIG_CHANGE',
        serviceName: this.serviceName,
        message: 'Environment configuration changed',
        metadata: {
          hashBefore: this.previousConfigHash,
          hashAfter: hash,
        },
      });
    }

    this.saveConfigHash(hash);
  }

  private loadPreviousConfigHash(): void {
    if (fs.existsSync(this.configHashPath)) {
      this.previousConfigHash = fs
        .readFileSync(this.configHashPath, 'utf-8')
        .trim();
    }
  }

  private saveConfigHash(hash: string): void {
    fs.writeFileSync(this.configHashPath, hash, 'utf-8');
  }

  private async sendEvent(payload: EventPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      await fetch(`${this.endpoint}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          timestamp: payload.timestamp ?? Date.now(),
        }),
      });
    } catch {
      // Observability must NEVER crash the application.
    }
  }
}

const sdk = new TraceOpsSDK();

export default {
  init: (opts: TraceOpsInitOptions) => sdk.init(opts),
  express: (app: Express) => sdk.express(app),
  captureError: (error: Error | unknown, metadata?: Record<string, unknown>) =>
    sdk.captureError(error, metadata),
  configChange: (message?: string, metadata?: Record<string, unknown>) =>
    sdk.configChange(message, metadata),
};
