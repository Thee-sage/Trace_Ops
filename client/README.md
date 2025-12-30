# TraceOps SDK

One-line integration for automatic event capture in Node.js applications.

## Philosophy

The SDK is designed for zero-friction integration. Call `TraceOps.init()` once, and errors, deployments, and configuration changes are captured automatically. No manual logging, no instrumentation code, no boilerplate.

## One-Line Integration

```typescript
import TraceOps from '@traceops/sdk';

TraceOps.init({
  endpoint: 'http://localhost:3000',
  serviceName: 'my-service'
});
```

That's it. Errors are now captured automatically.

## Automatic Capture

The SDK hooks into Node.js process events and Express middleware to capture:

**Runtime failures**: Uncaught exceptions and unhandled promise rejections are captured with full stack traces and process metadata.

**Express errors**: Any error thrown in Express routes is captured with request context (method, path, status code, user agent, IP).

**Deployments**: On process start, a DEPLOY event is emitted with process metadata (PID, Node version, platform, architecture). If `package.json` exists, version is included.

**Configuration changes**: On process start, the SDK reads `.env` file (if present), normalizes it (sorts lines, removes comments), hashes it, and compares with previous hash. If different, a CONFIG_CHANGE event is emitted.

## Why Manual Logging Is Avoided

The SDK intentionally avoids manual logging APIs like `traceops.error()` or `traceops.deploy()`. The goal is to capture events automatically without requiring developers to instrument their code. This reduces integration friction and ensures nothing is missed.

If you need to capture custom events, use the backend API directly. The SDK focuses on automatic capture of common patterns.

## Express Integration

For Express applications, call `TraceOps.express(app)` after all routes are defined. This attaches an error handler middleware that captures route errors. The middleware must be registered last so it catches errors from all routes.

```typescript
import express from 'express';
import TraceOps from '@traceops/sdk';

TraceOps.init({ endpoint: '...', serviceName: '...' });

const app = express();
app.use(express.json());
app.use(yourRoutes);

TraceOps.express(app); // Must be last
```

## Supported Environments

The SDK targets Node.js 16+ and Express 4+. It uses standard Node.js APIs (`process.on`, `fs.readFileSync`, `crypto.createHash`) and has no external dependencies beyond `express` types.

For non-Express applications, runtime error capture still works. Only Express route error capture requires the `express()` call.

## What the SDK Does Not Do

The SDK does not provide manual event APIs, does not buffer events locally, does not retry failed sends, does not batch events, and does not support custom transports. It sends events synchronously (fire-and-forget) and fails silently if the backend is unavailable. Observability must never crash the application.

## Configuration Hash Storage

The SDK stores configuration hashes in `.traceops-config-hash` in the application directory (or temp directory if `process.cwd()` fails). This file persists across restarts to enable CONFIG_CHANGE detection. The file is created automatically and requires no manual management.
