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

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `endpoint` | `string` | ✅ | — | Base URL of your TraceOps backend |
| `serviceName` | `string` | ✅ | — | Unique service identifier (e.g. `'auth-service'`) |
| `apiKey` | `string` | ❌ | — | API key for authenticated backends |
| `safeMode` | `boolean` | ❌ | `true` | Master toggle for all safety protections |
| `maxStackLength` | `number` | ❌ | `2000` | Max stack trace characters |
| `maxMetadataDepth` | `number` | ❌ | `3` | Max object nesting depth |
| `maxMetadataSize` | `number` | ❌ | `10240` | Max metadata bytes (10KB) |
| `maxEventsPerMinute` | `number` | ❌ | `30` | Rate limit ceiling per 60s window |
| `dedupeWindowMs` | `number` | ❌ | `60000` | Dedup window for identical errors (ms) |

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

Handles all input types safely:
- **Error objects** → captured normally
- **Strings / primitives** → wrapped in `new Error()`
- **`null` / `undefined`** → `"[No error provided]"`
- **Plain objects** (e.g. `{ code: 500 }`) → serialized as message, attached as metadata

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

## Data Privacy & Safe Mode

TraceOps is designed with **privacy-by-default**. Safe mode is enabled automatically and provides multiple layers of protection:

### What is collected

| Data | Purpose | Contains secrets? |
|---|---|---|
| Error messages | Root-cause analysis | ❌ No |
| Stack traces | Debugging | ❌ No (truncated to 2000 chars) |
| OS / Node version / PID | Environment context | ❌ No |
| `.env` file **SHA-256 hash** | Detect config drift | ❌ Hash only, not contents |
| Custom metadata you pass | Your context | ⚠️ You control this (auto-scrubbed) |

### What is NOT collected

- ❌ Raw environment variable values
- ❌ API keys, tokens, or passwords
- ❌ File contents (only hashes)
- ❌ Network traffic or request bodies
- ❌ Source code

### Automatic key redaction

When `safeMode: true` (default), any metadata key matching these patterns is replaced with `[REDACTED]`:

```
password, passwd, pwd, secret, token, apikey, api_key,
authorization, auth, credential, credentials, private_key,
privatekey, access_token, refresh_token, session, sessionid,
session_id, cookie, ssn, credit_card, creditcard
```

This works **recursively** on nested objects and arrays.

### HTTP header stripping

If metadata contains a `headers` object, the following headers are automatically redacted:

```
authorization, cookie, set-cookie, x-api-key,
proxy-authorization, x-forwarded-for
```

### Dangerous object detection

If metadata contains keys like `req`, `res`, `socket`, `process`, `global`, or `window`, the value is replaced with `[Unsupported Type: key]`. These framework objects are huge, often circular, and may contain sensitive data.

### Non-serializable value handling

| Type | Replacement |
|---|---|
| Functions | `[Function: name]` |
| Symbols | `[Symbol: description]` |
| RegExp | `[RegExp: /pattern/flags]` |
| Buffer / Uint8Array | `[Buffer: N bytes]` |
| BigInt | Converted to string |
| Date | ISO 8601 string |
| Circular references | `[Circular Reference]` |

### Over-collection limits

| Limit | Default | Description |
|---|---|---|
| Object depth | 3 levels | Beyond this → `[Object depth limit]` |
| Metadata size | 10KB | Entries trimmed until under limit |
| String values | 5KB | Truncated with marker |
| Array items | 100 | Remainder shown as `... N more items` |
| Total payload | 50KB | Metadata stripped if exceeded |
| Stack traces | 2000 chars | Truncated with marker |

### Rate limiting

Events are capped at **30 per minute** (configurable). When the limit is hit:
- A `console.warn` is emitted once
- Excess events are silently dropped
- Normal operation resumes when the window resets

### Error deduplication

If the same error (same type + message) fires multiple times within **60 seconds** (configurable):
- Only the first event is sent
- Duplicates are silently suppressed
- A `_duplicatesSuppressed` count is attached when available

### Disabling safe mode

If you handle data scrubbing yourself:

```ts
TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'my-service',
  safeMode: false, // disable all automatic protections
});
```

---

## Misconfiguration Detection

TraceOps validates your init options and warns about common mistakes:

| Issue | Warning |
|---|---|
| Empty `endpoint` | `"endpoint is required but was empty"` |
| Non-HTTP endpoint | `"doesn't start with http:// or https://"` |
| Empty `serviceName` | `"serviceName is required but was empty"` |
| Special chars in `serviceName` | `"contains special characters — use slug-style"` |
| Empty string `apiKey` | `"apiKey was provided but is an empty string"` |

All warnings go to `console.warn('[TraceOps]', ...)` — **the SDK never crashes your app**.

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
- **Rate limit warnings?** Increase `maxEventsPerMinute` or investigate why your app is throwing so many errors
- **`[Metadata truncated]` in events?** Reduce the amount of data you pass as metadata, or increase `maxMetadataSize`
