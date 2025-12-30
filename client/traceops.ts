import type { Express, Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TraceOpsInitOptions {
  endpoint: string;
  serviceName: string;
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

  init(options: TraceOpsInitOptions): void {
    if (this.initialized) return;

    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.serviceName = options.serviceName;

    this.loadPreviousConfigHash();
    this.setupErrorHandlers();

    void this.detectConfigChange();
    void this.captureDeploy();

    this.initialized = true;
  }

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

  private async captureError(
    error: Error,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.sendEvent({
      eventType: 'ERROR',
      serviceName: this.serviceName,
      message: error.message || 'Unknown error',
      metadata: {
        name: error.name,
        stack: error.stack,
        ...metadata,
      },
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

  // ✅ ONLY ONE sendEvent METHOD — THIS IS THE FIX
  private async sendEvent(payload: EventPayload): Promise<void> {
    try {
      await fetch(`${this.endpoint}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // observability must NEVER crash the app
    }
  }
}

const sdk = new TraceOpsSDK();

export default {
  init: (opts: TraceOpsInitOptions) => sdk.init(opts),
  express: (app: Express) => sdk.express(app),
};
