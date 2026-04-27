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

  /**
   * When true (default), TraceOps automatically:
   * - Redacts sensitive keys (password, token, secret, authorization, etc.)
   * - Strips dangerous HTTP headers (authorization, cookie, set-cookie)
   * - Truncates stack traces to a safe length
   * - Limits metadata depth, size, and array lengths
   * - Detects and replaces non-serializable values (functions, symbols, etc.)
   * - Replaces dangerous objects (req, res, socket, global, process, window)
   * - Rate-limits events to prevent flooding
   * - Deduplicates identical errors within a time window
   *
   * Set to false only if you handle data scrubbing yourself.
   * @default true
   */
  safeMode?: boolean;

  /**
   * Maximum allowed stack trace length in characters.
   * Only used when safeMode is true.
   * @default 2000
   */
  maxStackLength?: number;

  /**
   * Maximum metadata object nesting depth.
   * Objects deeper than this become "[Object depth limit]".
   * Only used when safeMode is true.
   * @default 3
   */
  maxMetadataDepth?: number;

  /**
   * Maximum serialized metadata size in bytes.
   * If metadata exceeds this, it is truncated.
   * Only used when safeMode is true.
   * @default 10240 (10KB)
   */
  maxMetadataSize?: number;

  /**
   * Maximum number of events allowed per 60-second window.
   * Events beyond this limit are silently dropped.
   * Only used when safeMode is true.
   * @default 30
   */
  maxEventsPerMinute?: number;

  /**
   * Time window (ms) for deduplicating identical errors.
   * If the same error fires again within this window, it is dropped
   * and a duplicateCount is attached to the original.
   * Only used when safeMode is true.
   * @default 60000 (60 seconds)
   */
  dedupeWindowMs?: number;
}

interface EventPayload {
  eventType: 'DEPLOY' | 'CONFIG_CHANGE' | 'ERROR';
  serviceName: string;
  timestamp?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = [
  'password', 'passwd', 'pwd',
  'secret', 'token', 'apikey', 'api_key',
  'authorization', 'auth',
  'credential', 'credentials',
  'private_key', 'privatekey',
  'access_token', 'refresh_token',
  'session', 'sessionid', 'session_id',
  'cookie',
  'ssn', 'credit_card', 'creditcard',
];

/** HTTP headers that should always be scrubbed from metadata. */
const SENSITIVE_HEADERS = [
  'authorization', 'cookie', 'set-cookie',
  'x-api-key', 'proxy-authorization',
  'x-forwarded-for',
];

/**
 * Top-level keys that indicate someone passed an entire framework
 * object (Express req/res, Node socket, global, etc.).
 * These are never safe to serialize — they're huge, circular, and
 * may contain sensitive data.
 */
const DANGEROUS_OBJECT_KEYS = [
  'req', 'res', 'request', 'response',
  'socket', 'client',
  'window', 'global', 'globalThis', 'process',
];

const REDACTED = '[REDACTED]';
const MAX_STRING_LENGTH = 5120;  // 5KB per string value
const MAX_ARRAY_ITEMS = 100;
const MAX_PAYLOAD_BYTES = 51200; // 50KB total payload guard

// ─────────────────────────────────────────────────────────────────────────
// Sanitization utilities
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if a key matches any sensitive pattern.
 * Normalizes both the key and the patterns by stripping separators.
 */
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, '');
  return SENSITIVE_KEYS.some(
    sk => normalized.includes(sk.replace(/[-_\s]/g, ''))
  );
}

/**
 * Recursively sanitize an object:
 * - Redact sensitive keys
 * - Strip dangerous HTTP headers
 * - Replace dangerous framework objects (req, res, etc.)
 * - Replace non-serializable values (functions, symbols, RegExp)
 * - Truncate huge strings
 * - Cap array lengths
 * - Detect circular references
 * - Enforce depth limits
 */
function sanitize(
  obj: Record<string, unknown> | undefined,
  maxDepth: number,
  seen?: WeakSet<object>,
): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return obj;

  // Circular reference detection
  if (!seen) seen = new WeakSet();
  if (seen.has(obj)) return { _circular: '[Circular Reference]' };
  seen.add(obj);

  if (maxDepth <= 0) return { _truncated: '[Object depth limit]' };

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 1. Dangerous top-level objects (req, res, socket, etc.)
    if (
      DANGEROUS_OBJECT_KEYS.includes(key.toLowerCase()) &&
      value !== null &&
      typeof value === 'object'
    ) {
      clean[key] = `[Unsupported Type: ${key}]`;
      continue;
    }

    // 2. Sensitive key redaction
    if (isSensitiveKey(key)) {
      clean[key] = REDACTED;
      continue;
    }

    // 3. If this is a "headers" object, scrub dangerous headers inside it
    if (
      key.toLowerCase() === 'headers' &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      const scrubbed = { ...(value as Record<string, unknown>) };
      for (const h of SENSITIVE_HEADERS) {
        // Headers can be any casing
        for (const hk of Object.keys(scrubbed)) {
          if (hk.toLowerCase() === h) {
            scrubbed[hk] = REDACTED;
          }
        }
      }
      clean[key] = sanitize(scrubbed, maxDepth - 1, seen);
      continue;
    }

    // 4. Handle value types
    clean[key] = sanitizeValue(value, maxDepth - 1, seen);
  }

  return clean;
}

/**
 * Sanitize a single value based on its type.
 */
function sanitizeValue(
  value: unknown,
  remainingDepth: number,
  seen: WeakSet<object>,
): unknown {
  // null / undefined — pass through
  if (value === null || value === undefined) return value;

  // Functions → label
  if (typeof value === 'function') {
    return `[Function: ${(value as Function).name || 'anonymous'}]`;
  }

  // Symbols → label
  if (typeof value === 'symbol') {
    return `[Symbol: ${value.description || ''}]`;
  }

  // RegExp → label
  if (value instanceof RegExp) {
    return `[RegExp: ${value.toString()}]`;
  }

  // Strings — truncate if huge
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return value.slice(0, MAX_STRING_LENGTH) +
        `\n... [truncated at ${MAX_STRING_LENGTH} chars]`;
    }
    return value;
  }

  // Primitives (number, boolean, bigint)
  if (typeof value !== 'object') {
    return typeof value === 'bigint' ? value.toString() : value;
  }

  // Arrays — cap length, recurse items
  if (Array.isArray(value)) {
    const capped = value.slice(0, MAX_ARRAY_ITEMS);
    const result = capped.map(item => {
      if (item !== null && typeof item === 'object') {
        if (seen.has(item as object)) return '[Circular Reference]';
        return sanitize(
          item as Record<string, unknown>,
          remainingDepth,
          seen,
        );
      }
      return sanitizeValue(item, remainingDepth, seen);
    });
    if (value.length > MAX_ARRAY_ITEMS) {
      result.push(`... ${value.length - MAX_ARRAY_ITEMS} more items`);
    }
    return result;
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Buffer / Uint8Array → label
  if (value instanceof Buffer || value instanceof Uint8Array) {
    return `[Buffer: ${value.length} bytes]`;
  }

  // Generic object — recurse
  return sanitize(value as Record<string, unknown>, remainingDepth, seen);
}

/**
 * Truncate a stack trace string to a maximum character length.
 */
function truncateStack(stack: unknown, maxLength: number): unknown {
  if (typeof stack !== 'string') return stack;
  if (stack.length <= maxLength) return stack;
  return stack.slice(0, maxLength) + `\n    ... [truncated at ${maxLength} chars]`;
}

/**
 * Enforce a byte-size limit on serialized metadata.
 * Returns the metadata object, possibly stripped down to stay under the limit.
 */
function enforceMetadataSize(
  metadata: Record<string, unknown> | undefined,
  maxBytes: number,
): Record<string, unknown> | undefined {
  if (!metadata) return metadata;

  let json: string;
  try {
    json = JSON.stringify(metadata);
  } catch {
    return { _error: '[Metadata could not be serialized]' };
  }

  if (json.length <= maxBytes) return metadata;

  // Try to keep as many top-level keys as possible
  const trimmed: Record<string, unknown> = {};
  let currentSize = 2; // opening/closing braces

  for (const [key, value] of Object.entries(metadata)) {
    let entryJson: string;
    try {
      entryJson = JSON.stringify({ [key]: value });
    } catch {
      continue;
    }
    const entrySize = entryJson.length - 2; // subtract braces
    if (currentSize + entrySize + 1 > maxBytes) break; // +1 for comma
    trimmed[key] = value;
    currentSize += entrySize + 1;
  }

  trimmed._truncated = `[Metadata truncated — exceeded ${Math.round(maxBytes / 1024)}KB]`;
  return trimmed;
}

// ─────────────────────────────────────────────────────────────────────────
// Rate limiter
// ─────────────────────────────────────────────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private limitHitWarned = false;

  constructor(
    private maxPerWindow: number,
    private windowMs: number = 60_000,
  ) {}

  /**
   * Returns true if the event is allowed, false if rate-limited.
   */
  allow(): boolean {
    const now = Date.now();
    // Purge expired timestamps
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxPerWindow) {
      if (!this.limitHitWarned) {
        this.limitHitWarned = true;
        console.warn(
          `[TraceOps] Rate limit reached (${this.maxPerWindow} events/${this.windowMs / 1000}s). ` +
          `Further events will be silently dropped until the window resets.`
        );
        // Reset warning flag after window passes
        setTimeout(() => { this.limitHitWarned = false; }, this.windowMs);
      }
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Error deduplicator
// ─────────────────────────────────────────────────────────────────────────

interface DedupeEntry {
  firstSeen: number;
  count: number;
}

class ErrorDeduplicator {
  private seen = new Map<string, DedupeEntry>();

  constructor(private windowMs: number = 60_000) {}

  /**
   * Returns true if the event is new (should be sent),
   * false if it's a duplicate within the window.
   */
  shouldSend(eventType: string, message: string): boolean {
    const hash = `${eventType}::${message}`;
    const now = Date.now();

    this.cleanup(now);

    const existing = this.seen.get(hash);
    if (existing) {
      existing.count++;
      return false;
    }

    this.seen.set(hash, { firstSeen: now, count: 1 });
    return true;
  }

  /**
   * Get the duplicate count for a given event and clear the entry.
   */
  getDuplicateCount(eventType: string, message: string): number {
    const hash = `${eventType}::${message}`;
    const entry = this.seen.get(hash);
    return entry ? entry.count - 1 : 0; // subtract the original
  }

  private cleanup(now: number): void {
    for (const [hash, entry] of this.seen) {
      if (now - entry.firstSeen > this.windowMs) {
        this.seen.delete(hash);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────

function warn(message: string): void {
  console.warn(`[TraceOps] ${message}`);
}

function validateInitOptions(options: TraceOpsInitOptions): void {
  // Endpoint validation
  if (!options.endpoint) {
    warn('endpoint is required but was empty. Events will fail to send.');
  } else if (
    !options.endpoint.startsWith('http://') &&
    !options.endpoint.startsWith('https://')
  ) {
    warn(
      `endpoint "${options.endpoint}" doesn't start with http:// or https://. ` +
      `This will likely cause network errors.`
    );
  }

  // Service name validation
  if (!options.serviceName) {
    warn('serviceName is required but was empty.');
  } else if (/[^a-zA-Z0-9_-]/.test(options.serviceName)) {
    warn(
      `serviceName "${options.serviceName}" contains special characters. ` +
      `Use a slug-style name (e.g. 'payments-api') for best compatibility.`
    );
  }

  // API key validation
  if (options.apiKey !== undefined && options.apiKey.trim() === '') {
    warn(
      'apiKey was provided but is an empty string. ' +
      'This will be sent as-is — did you mean to omit it?'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main SDK class
// ─────────────────────────────────────────────────────────────────────────

class TraceOpsSDK {
  private endpoint!: string;
  private serviceName!: string;
  private apiKey: string | undefined;

  // Safe mode settings
  private safeMode = true;
  private maxStackLength = 2000;
  private maxMetadataDepth = 3;
  private maxMetadataSize = 10240; // 10KB

  // Rate limiting & dedup
  private rateLimiter!: RateLimiter;
  private deduplicator!: ErrorDeduplicator;

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

  // ─────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────

  init(options: TraceOpsInitOptions): void {
    if (this.initialized) return;

    // 6. Misconfiguration detection — warn, never crash
    validateInitOptions(options);

    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.serviceName = options.serviceName;
    this.apiKey = options.apiKey;

    // Safe mode settings
    this.safeMode = options.safeMode !== false; // default true
    this.maxStackLength = options.maxStackLength ?? 2000;
    this.maxMetadataDepth = options.maxMetadataDepth ?? 3;
    this.maxMetadataSize = options.maxMetadataSize ?? 10240;

    // Rate limiter & deduplicator
    this.rateLimiter = new RateLimiter(
      options.maxEventsPerMinute ?? 30,
    );
    this.deduplicator = new ErrorDeduplicator(
      options.dedupeWindowMs ?? 60_000,
    );

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
   * Handles all input types safely:
   * - Error objects → captured normally
   * - Strings / primitives → wrapped in new Error()
   * - null / undefined → "[No error provided]"
   * - Plain objects (e.g. { code: 500 }) → message from JSON, object as metadata
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
    // 3. Normalize non-errors
    let err: Error;
    let extraMeta: Record<string, unknown> = {};

    if (error === null || error === undefined) {
      err = new Error('[No error provided]');
    } else if (error instanceof Error) {
      err = error;
    } else if (typeof error === 'object') {
      // Someone did: throw { code: 500, msg: 'fail' }
      try {
        const summary = JSON.stringify(error).slice(0, 200);
        err = new Error(`Non-Error object thrown: ${summary}`);
        extraMeta = { originalObject: error as Record<string, unknown> };
      } catch {
        err = new Error('[Non-serializable object thrown]');
      }
    } else {
      err = new Error(String(error));
    }

    let mergedMeta: Record<string, unknown> = {
      name: err.name,
      stack: err.stack,
      ...extraMeta,
      ...metadata,
    };

    // Apply safe-mode protections
    if (this.safeMode) {
      mergedMeta.stack = truncateStack(mergedMeta.stack, this.maxStackLength);
      mergedMeta = sanitize(mergedMeta, this.maxMetadataDepth) ?? mergedMeta;
      mergedMeta = enforceMetadataSize(mergedMeta, this.maxMetadataSize) ?? mergedMeta;
    }

    await this.sendEvent({
      eventType: 'ERROR',
      serviceName: this.serviceName,
      message: err.message || 'Unknown error',
      metadata: mergedMeta,
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
    let safeMeta = metadata;
    if (this.safeMode && metadata) {
      safeMeta = sanitize(metadata, this.maxMetadataDepth);
      safeMeta = enforceMetadataSize(safeMeta, this.maxMetadataSize);
    }

    await this.sendEvent({
      eventType: 'CONFIG_CHANGE',
      serviceName: this.serviceName,
      message: message || 'Configuration changed',
      metadata: safeMeta,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────

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
      // 4. Rate limiting — drop events beyond the cap
      if (this.safeMode && !this.rateLimiter.allow()) {
        return;
      }

      // 4. Deduplication — drop identical events within the window
      if (this.safeMode && payload.eventType === 'ERROR') {
        if (!this.deduplicator.shouldSend(payload.eventType, payload.message || '')) {
          return;
        }

        // Attach duplicate count from previous window if any
        const dupeCount = this.deduplicator.getDuplicateCount(
          payload.eventType, payload.message || ''
        );
        if (dupeCount > 0 && payload.metadata) {
          payload.metadata._duplicatesSuppressed = dupeCount;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const body = JSON.stringify({
        ...payload,
        timestamp: payload.timestamp ?? Date.now(),
      });

      // 5. Final payload size guard
      if (body.length > MAX_PAYLOAD_BYTES) {
        warn(
          `Event payload is ${Math.round(body.length / 1024)}KB ` +
          `(limit: ${Math.round(MAX_PAYLOAD_BYTES / 1024)}KB). Metadata will be trimmed.`
        );
        // Re-serialize with stripped metadata
        const stripped = {
          ...payload,
          timestamp: payload.timestamp ?? Date.now(),
          metadata: {
            _error: `[Payload exceeded ${Math.round(MAX_PAYLOAD_BYTES / 1024)}KB — metadata stripped]`,
            eventType: payload.eventType,
            serviceName: payload.serviceName,
          },
        };
        await fetch(`${this.endpoint}/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify(stripped),
        });
        return;
      }

      await fetch(`${this.endpoint}/events`, {
        method: 'POST',
        headers,
        body,
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
