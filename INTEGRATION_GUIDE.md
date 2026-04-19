# TraceOps Integration Guide

Complete reference for integrating TraceOps into any Node.js / Express project.

---

## What TraceOps Gives You

Once integrated, TraceOps automatically:

| Captured | When |
|---|---|
| **DEPLOY** | Every time the monitored process starts |
| **CONFIG_CHANGE** | When the `.env` file content changes between restarts |
| **ERROR** | Uncaught exceptions, unhandled promise rejections |
| **ERROR** (Express) | Any error passed to `next(err)` in Express middleware |

These events are grouped into **Issues**, tracked through a lifecycle (open → resolved → regressed), and displayed on the TraceOps dashboard with priority scores and root-cause correlation.

---

## Prerequisites

- Node.js ≥ 18
- A running TraceOps backend (self-hosted or `https://trace-ops.onrender.com`)

---

## Step 1: Copy the SDK

```bash
# From your project root — copy traceops.ts from this repo
cp path/to/traceops/client/traceops.ts ./lib/traceops.ts
```

Or if it's published to npm:

```bash
npm install traceops-sdk
```

---

## Step 2: Initialize at App Startup

Call `TraceOps.init()` as early as possible — ideally before any routes are defined.

```ts
import TraceOps from './lib/traceops';     // or 'traceops-sdk'

TraceOps.init({
  endpoint: process.env.TRACEOPS_ENDPOINT ?? 'https://trace-ops.onrender.com',
  serviceName: 'my-service',               // slug-style, e.g. 'payments-api'
  apiKey: process.env.TRACEOPS_API_KEY,    // omit for open backends
});
```

**`init()` options:**

| Option | Type | Required | Description |
|---|---|---|---|
| `endpoint` | `string` | ✅ | Base URL of the TraceOps backend |
| `serviceName` | `string` | ✅ | Unique identifier for this service. Case-sensitive. |
| `apiKey` | `string` | ❌ | API key (required if backend has `TRACEOPS_API_KEY` set) |

---

## Step 3: Attach Express Middleware

```ts
import express from 'express';
import TraceOps from './lib/traceops';

const app = express();

// ... define all your routes here ...

// TraceOps MUST come after all routes
TraceOps.express(app);

app.listen(3000);
```

> [!IMPORTANT]
> `TraceOps.express(app)` attaches an Express error-capture middleware. It **must** be called after all your routes are defined, otherwise it won't catch route errors correctly.

---

## Step 4: Manual Capture (optional)

### Errors in try/catch

```ts
import TraceOps from './lib/traceops';

async function processPayment(orderId: string) {
  try {
    const result = await chargeCard(orderId);
    return result;
  } catch (err) {
    // Report to TraceOps without crashing
    await TraceOps.captureError(err, {
      orderId,
      route: 'POST /payments',
      userId: currentUser.id,
    });
    // Re-throw or handle as needed
    throw err;
  }
}
```

### Configuration changes

```ts
import TraceOps from './lib/traceops';

// After updating a feature flag, DB connection, or runtime config:
await updateFeatureFlag('new-checkout', true);
await TraceOps.configChange('Feature flag enabled: new-checkout', {
  flag: 'new-checkout',
  value: true,
  changedBy: 'deploy-bot',
});
```

---

## Environment Variables (Monitored Service)

Add these to the `.env` of the service you're monitoring:

```env
# Required: URL of your TraceOps backend
TRACEOPS_ENDPOINT=https://trace-ops.onrender.com

# Required if your backend enforces API key auth
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
```

---

## Environment Variables (TraceOps Backend)

Set these when running the TraceOps backend:

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/traceops

# Optional: Enable API key auth for event ingestion (recommended for production)
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx

# Optional: Additional allowed frontend origins (comma-separated)
# Default includes localhost:5173 and traceops.vercel.app
CORS_ORIGINS=https://my-company.com,https://dashboard.my-company.com
```

---

## Multiple Services

TraceOps supports any number of services — each identified by its `serviceName`. Simply integrate the SDK into each service with a different `serviceName`:

```ts
// payments-api/src/index.ts
TraceOps.init({ endpoint: '...', serviceName: 'payments-api', apiKey: '...' });

// auth-service/src/index.ts
TraceOps.init({ endpoint: '...', serviceName: 'auth-service', apiKey: '...' });
```

Each service appears as a separate card on the TraceOps dashboard.

---

## Non-Express Frameworks

TraceOps works with any Node.js framework. For non-Express setups, use `captureError()` manually:

```ts
// Fastify
fastify.setErrorHandler(async (error, request, reply) => {
  await TraceOps.captureError(error, {
    method: request.method,
    path: request.url,
    statusCode: reply.statusCode,
  });
  reply.status(500).send({ error: 'Internal Server Error' });
});
```

```ts
// Generic Node.js HTTP server
process.on('uncaughtException', async (err) => {
  await TraceOps.captureError(err, { type: 'uncaughtException' });
  process.exit(1);
});
```

---

## Metadata Schema

Any `metadata` object passed to `captureError()` or `configChange()` is stored as-is and displayed in the TraceOps event detail. Standard fields that affect impact metrics:

| Field | Type | Effect |
|---|---|---|
| `route` | `string` | Used to count unique affected routes per issue |
| `userId` | `string` | Used to count unique affected users per issue |
| `user_id` | `string` | Alternative to `userId` |

---

## Self-Hosting TraceOps

### Environment

```env
MONGODB_URI=mongodb+srv://...
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
CORS_ORIGINS=https://your-frontend.com
PORT=3000
NODE_ENV=production
```

### Deploy to Render

1. Fork the repo
2. Create a new **Web Service** in Render pointing to the `backend/` folder
3. Set environment variables above in the Render dashboard
4. Get your service URL (e.g. `https://my-traceops.onrender.com`)
5. Set `TRACEOPS_ENDPOINT=https://my-traceops.onrender.com` in each monitored service

### Deploy to Railway

```bash
cd backend
railway up
```

Set the same environment variables in the Railway dashboard.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Events not appearing | Wrong `endpoint` URL | Check `TRACEOPS_ENDPOINT` in your .env |
| Wrong service grouping | `serviceName` mismatch | Confirm exact slug (case-sensitive) |
| `401 Unauthorized` on POST | Missing/wrong API key | Pass `apiKey` in `init()`, matching backend `TRACEOPS_API_KEY` |
| CORS errors in browser | Origin not allowed | Add your origin to `CORS_ORIGINS` on the backend |
| No DEPLOY event | `init()` not called on startup | Call `TraceOps.init()` as early as possible |
| Errors not captured | `express()` called before routes | Move `TraceOps.express(app)` to after all route definitions |

---

## SDK is Fire-and-Forget

TraceOps SDK is designed to **never crash your application**. All network errors are silently swallowed. The SDK does not throw, does not block your request lifecycle, and does not affect your app's behaviour if the TraceOps backend is unreachable.
