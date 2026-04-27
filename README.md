# TraceOps

Incident timeline and root-cause engine for Node.js applications. Captures errors, deployments, and configuration changes — then correlates them into an actionable timeline.

**Live dashboard:** [trace-ops-frontend.vercel.app](https://trace-ops-frontend.vercel.app)

## Overview

TraceOps reduces incident investigation from minutes of log-sifting to a single timeline view. When production breaks, engineers face scattered logs, manual timestamp correlation, and cognitive overload. TraceOps provides a chronological event timeline that groups errors into issues, tracks resolution lifecycle, and highlights likely root causes.

```
SDK (your app) → Backend (event processing) → Frontend (timeline UI)
```

## Getting Started

### 1. Install the SDK

```bash
npm install traceops-sdk
```

### 2. Initialize in your application

```ts
import TraceOps from 'traceops-sdk';

TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'my-api',
  apiKey: process.env.TRACEOPS_API_KEY,
});

// Express: attach after all route definitions
TraceOps.express(app);
```

### 3. View events

Open the [TraceOps dashboard](https://trace-ops-frontend.vercel.app) to see your events on the timeline.

## SDK Reference

Full SDK documentation is available in [`client/README.md`](./client/README.md).

### Methods

| Method | Description |
|---|---|
| `TraceOps.init(options)` | Initialize the SDK. Call once at startup. |
| `TraceOps.express(app)` | Attach Express error-capture middleware. |
| `TraceOps.captureError(error, metadata?)` | Manually report a caught error. |
| `TraceOps.configChange(message?, metadata?)` | Record a configuration change. |

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | *required* | TraceOps backend URL |
| `serviceName` | `string` | *required* | Service identifier (e.g. `auth-service`) |
| `apiKey` | `string` | — | API key for authenticated backends |
| `safeMode` | `boolean` | `true` | Automatic data scrubbing and rate limiting |
| `maxStackLength` | `number` | `2000` | Stack trace character limit |
| `maxMetadataDepth` | `number` | `3` | Maximum metadata nesting depth |
| `maxMetadataSize` | `number` | `10240` | Maximum metadata size in bytes |
| `maxEventsPerMinute` | `number` | `30` | Event rate limit per 60-second window |
| `dedupeWindowMs` | `number` | `60000` | Deduplication window for identical errors |

### Automatic Capture

The SDK captures the following without any manual instrumentation:

| Event | Trigger |
|---|---|
| `DEPLOY` | Process start |
| `CONFIG_CHANGE` | `.env` file hash changes between restarts |
| `ERROR` | Uncaught exceptions and unhandled promise rejections |
| `ERROR` | Express middleware errors via `next(err)` |

### Manual Capture

```ts
// Catch blocks
try {
  await chargeCustomer(orderId);
} catch (err) {
  await TraceOps.captureError(err, { orderId, userId });
  res.status(500).json({ error: 'Payment failed' });
}

// Configuration changes
TraceOps.configChange('Feature flag updated', { flag: 'dark-mode', value: true });
```

## Data Safety

Safe mode is enabled by default. The SDK never transmits raw environment variables, API keys, passwords, or source code.

**Automatic protections include:**

- Redaction of sensitive metadata keys (`password`, `token`, `secret`, `authorization`, `cookie`, etc.)
- HTTP header stripping (`authorization`, `cookie`, `set-cookie`, `x-api-key`)
- Replacement of dangerous objects (`req`, `res`, `socket`, `process`, `global`)
- Circular reference detection
- Object depth limiting (3 levels), metadata size cap (10KB), stack trace truncation (2000 chars)
- Rate limiting (30 events/minute) and error deduplication (60-second window)
- Non-serializable value handling (functions, symbols, RegExp, Buffers)

See the full [data handling documentation](./client/README.md#data-handling) in the SDK README.

## Architecture

### Backend (`backend/`)

Node.js + Express + MongoDB. Ingests events from the SDK, groups errors into issues using deterministic fingerprints, tracks issue lifecycle (open → resolved → regressed), and computes priority scores based on frequency, recency, and impact.

**Key responsibilities:**
- Event ingestion and storage
- Error fingerprinting and issue grouping
- Issue lifecycle management
- Priority and impact computation
- Timeline correlation (deploy ↔ error ↔ config change)

### Frontend (`frontend/`)

Next.js dashboard. Displays a chronological event timeline, highlights correlated events, surfaces issues needing attention, and provides detail panels for root-cause investigation.

**Key features:**
- Chronological timeline with event filtering
- Issue grouping with resolution tracking
- Detail panel with metadata, stack traces, and context
- Responsive layout (mobile, tablet, desktop)

### SDK (`client/`)

Lightweight TypeScript library published as [`traceops-sdk`](https://www.npmjs.com/package/traceops-sdk) on npm. Framework-agnostic core with Express middleware support. Zero runtime dependencies.

## Self-Hosting

### Backend

Deploy `backend/` to Render, Railway, or any Node.js host.

```env
MONGODB_URI=mongodb+srv://...
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
CORS_ORIGINS=https://your-frontend.com
PORT=3000
NODE_ENV=production
```

### Frontend

Deploy `frontend/` to Vercel or Netlify. Set the API base URL:

```env
VITE_API_BASE=https://your-backend-url.com
```

### SDK

Point the SDK to your self-hosted backend:

```ts
TraceOps.init({
  endpoint: 'https://your-backend-url.com',
  serviceName: 'my-service',
  apiKey: 'tr_live_xxxxxxxxxxxx',
});
```

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `TRACEOPS_API_KEY` | No | Shared API key for authenticated ingestion |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `PORT` | No | Server port (default: 3000) |

### SDK (in your application)

| Variable | Required | Description |
|---|---|---|
| `TRACEOPS_API_KEY` | No | Must match the backend's `TRACEOPS_API_KEY` |

## Project Structure

```
traceops/
├── backend/     Event ingestion, issue grouping, lifecycle tracking
├── frontend/    Timeline dashboard (Next.js)
├── client/      SDK source + npm package (traceops-sdk)
└── extras/      Supplementary tooling
```

## License

MIT
