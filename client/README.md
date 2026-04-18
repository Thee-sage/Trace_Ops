# TraceOps SDK

Automatic incident capture for Node.js / Express applications.  
Plug in two lines — TraceOps handles the rest.

---

## Quick Start

```bash
# Copy traceops.ts into your project (or install once published to npm)
cp path/to/traceops-sdk/traceops.ts ./lib/traceops.ts
```

```ts
import TraceOps from './lib/traceops';

TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com', // your TraceOps backend
  serviceName: 'payments-api',                 // unique name for this service
  apiKey: process.env.TRACEOPS_API_KEY,        // leave undefined for open backends
});

// For Express: attach after all your routes
TraceOps.express(app);
```

That's it. On startup TraceOps automatically:

- Emits a **DEPLOY** event (captures version, platform, Node version)
- Detects `.env` hash changes and emits a **CONFIG_CHANGE** event
- Captures any **unhandled errors** and **unhandled promise rejections**
- Captures **Express route errors** via the middleware attached by `TraceOps.express(app)`

---

## API Reference

### `TraceOps.init(options)`

Must be called once before any other method.

| Option | Type | Required | Description |
|---|---|---|---|
| `endpoint` | `string` | ✅ | Base URL of your TraceOps backend |
| `serviceName` | `string` | ✅ | Unique service identifier (e.g. `'auth-service'`) |
| `apiKey` | `string` | ❌ | API key for authenticated backends |

---

### `TraceOps.express(app)`

Attaches an Express error-capture middleware. Call **after** defining all your routes.

```ts
app.use('/api', myRouter);
// ... all routes ...
TraceOps.express(app); // ← last
```

---

### `TraceOps.captureError(error, metadata?)`

Manually capture an error. Use this in `catch` blocks for errors that are handled gracefully.

```ts
try {
  await processPayment(orderId);
} catch (err) {
  await TraceOps.captureError(err, {
    orderId,
    userId: req.user.id,
    route: req.path,
  });
  res.status(500).json({ error: 'Payment failed' });
}
```

Common useful metadata fields:

| Key | Description |
|---|---|
| `route` | HTTP route path (e.g. `/api/payments`) |
| `userId` | ID of the affected user |
| `method` | HTTP method |

---

### `TraceOps.configChange(message?, metadata?)`

Manually signal a runtime configuration change.

```ts
await updateFeatureFlag('dark-mode', true);
TraceOps.configChange('Feature flag updated: dark-mode=true', {
  flag: 'dark-mode',
  value: true,
});
```

---

## Environment Variables

Set these in the **monitored service's** environment:

| Variable | Description |
|---|---|
| `TRACEOPS_API_KEY` | API key matching `TRACEOPS_API_KEY` on the backend |

---

## What Gets Captured Automatically

| Event | When |
|---|---|
| `DEPLOY` | Every process start |
| `CONFIG_CHANGE` | When `.env` file content changes between restarts |
| `ERROR` | Uncaught exceptions / unhandled rejections |
| `ERROR` (Express) | Any `next(err)` in Express routes |

---

## Self-Hosting

```env
# TraceOps backend .env
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
CORS_ORIGINS=https://myapp.com,https://dashboard.myapp.com
MONGODB_URI=mongodb+srv://...
```

---

## Troubleshooting

- **Events not appearing?** Check `endpoint` URL and `serviceName` (case-sensitive)
- **Getting 401?** Set `TRACEOPS_API_KEY` on the backend and pass the same as `apiKey` in `init()`
- **CORS errors?** Add your frontend origin to `CORS_ORIGINS` in the backend `.env`
