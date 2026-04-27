# TraceOps SDK

Lightweight observability SDK for Node.js applications. Captures errors, deployments, and configuration changes with built-in data safety.

```
npm install traceops-sdk
```

## Installation

```ts
import TraceOps from 'traceops-sdk';

TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'payments-api',
  apiKey: process.env.TRACEOPS_API_KEY,
});

// Express middleware — attach after all routes
TraceOps.express(app);
```

Once initialized, the SDK automatically captures:

- **Deployments** — process start with version, platform, and runtime metadata
- **Configuration changes** — `.env` file hash drift between restarts
- **Errors** — uncaught exceptions, unhandled rejections, and Express route errors

## API

### `TraceOps.init(options)`

Initialize the SDK. Must be called once before any other method.

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | *required* | TraceOps backend URL |
| `serviceName` | `string` | *required* | Service identifier (slug format, e.g. `auth-service`) |
| `apiKey` | `string` | — | API key for authenticated backends |
| `safeMode` | `boolean` | `true` | Enable automatic data scrubbing and rate limiting |
| `maxStackLength` | `number` | `2000` | Stack trace character limit |
| `maxMetadataDepth` | `number` | `3` | Maximum object nesting depth in metadata |
| `maxMetadataSize` | `number` | `10240` | Maximum serialized metadata size (bytes) |
| `maxEventsPerMinute` | `number` | `30` | Event rate limit per 60-second window |
| `dedupeWindowMs` | `number` | `60000` | Deduplication window for identical errors (ms) |

### `TraceOps.express(app)`

Attach error-capture middleware to an Express application. Call after all route definitions.

```ts
app.use('/api', router);
TraceOps.express(app);
```

### `TraceOps.captureError(error, metadata?)`

Manually capture an error with optional context.

```ts
try {
  await processPayment(orderId);
} catch (err) {
  await TraceOps.captureError(err, { orderId, userId: req.user.id });
  res.status(500).json({ error: 'Payment failed' });
}
```

Accepts `Error` objects, strings, plain objects, `null`, and `undefined`. Non-Error inputs are normalized automatically.

### `TraceOps.configChange(message?, metadata?)`

Record a configuration change event.

```ts
TraceOps.configChange('Feature flag updated', { flag: 'dark-mode', value: true });
```

## Data Handling

### Collected data

| Data | Purpose |
|---|---|
| Error message and stack trace | Root-cause analysis |
| OS, Node.js version, PID, architecture | Environment context |
| `.env` file SHA-256 hash | Configuration drift detection |
| User-provided metadata | Application-specific context |

The SDK does not read or transmit raw environment variables, API keys, tokens, file contents, request bodies, or source code. The `.env` file is hashed locally; only the hash is transmitted.

### Safe mode

Enabled by default. Provides the following protections:

**Key redaction** — Metadata keys matching sensitive patterns are replaced with `[REDACTED]` before transmission. Patterns include `password`, `token`, `secret`, `apiKey`, `authorization`, `credential`, `session`, `cookie`, `ssn`, and `credit_card`. Matching is case-insensitive and ignores separators. Applied recursively through nested objects and arrays.

**Header scrubbing** — When metadata contains a `headers` object, values for `authorization`, `cookie`, `set-cookie`, `x-api-key`, `proxy-authorization`, and `x-forwarded-for` are redacted.

**Object safety** — Keys referencing framework objects (`req`, `res`, `socket`, `process`, `global`, `window`) are replaced with `[Unsupported Type]`. Non-serializable values are converted to descriptive labels:

| Input type | Output |
|---|---|
| Function | `[Function: name]` |
| Symbol | `[Symbol: description]` |
| RegExp | `[RegExp: /pattern/flags]` |
| Buffer | `[Buffer: N bytes]` |
| Circular reference | `[Circular Reference]` |
| Date | ISO 8601 string |

**Size limits** — Enforced to prevent payload bloat:

| Constraint | Default |
|---|---|
| Object depth | 3 levels |
| Metadata size | 10 KB |
| String values | 5 KB |
| Array items | 100 |
| Stack traces | 2,000 characters |
| Total event payload | 50 KB |

Values exceeding limits are truncated with a marker indicating the cutoff point.

**Rate limiting** — Events are capped at 30 per 60-second window. Excess events are dropped silently. A single `console.warn` is emitted when the limit is first reached.

**Deduplication** — Identical errors (matched by type and message) within a 60-second window are suppressed. Only the first occurrence is transmitted.

### Disabling safe mode

```ts
TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'my-service',
  safeMode: false,
});
```

## Configuration Validation

The SDK validates init options at startup and emits warnings via `console.warn` for common issues: missing or malformed `endpoint`, empty `serviceName`, non-slug characters in service names, and empty-string API keys. Validation never throws — the SDK will not crash your application.

## Environment Variables

| Variable | Description |
|---|---|
| `TRACEOPS_API_KEY` | Shared key for authenticated backends |

## Self-Hosting

```env
TRACEOPS_API_KEY=tr_live_xxxxxxxxxxxx
CORS_ORIGINS=https://myapp.com,https://dashboard.myapp.com
MONGODB_URI=mongodb+srv://...
```

## Troubleshooting

| Symptom | Resolution |
|---|---|
| Events not appearing | Verify `endpoint` URL and `serviceName` (case-sensitive) |
| 401 responses | Ensure `apiKey` matches `TRACEOPS_API_KEY` on the backend |
| CORS errors | Add your frontend origin to `CORS_ORIGINS` in the backend configuration |
| Rate limit warnings | Increase `maxEventsPerMinute` or investigate excessive error volume |
| Truncated metadata | Reduce metadata payload size or increase `maxMetadataSize` |

## License

MIT
