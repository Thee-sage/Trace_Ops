# TraceOps Backend

Event ingestion, issue grouping, lifecycle tracking, and priority computation engine.

## Architecture

The backend operates in four layers: capture, grouping, lifecycle, and impact computation. Events arrive via HTTP API, are stored in-memory, grouped into issues using deterministic fingerprints, tracked through resolution cycles, and prioritized by impact metrics.

## Event Ingestion Model

Events arrive as JSON payloads with `eventType`, `serviceName`, `timestamp`, `message`, and optional `metadata`. Three event types are supported: `DEPLOY`, `CONFIG_CHANGE`, and `ERROR`. The storage layer maintains events in a Map keyed by ID, with filtering by service, type, and time range.

Events are not validated beyond required fields. Invalid events are rejected at the API boundary. No schema enforcement beyond TypeScript types.

## Timeline Storage

Events are stored in-memory using a `Map<string, Event>` structure. This choice was intentional for hackathon scope—no database setup required, faster iteration, sufficient for demo workloads. Events persist only for the lifetime of the process.

The storage layer provides CRUD operations and filtering. Events are sorted by timestamp (newest first) by default, but timeline endpoints return chronological order (oldest first) for visualization.

## Issue Grouping

Errors are grouped into issues using deterministic fingerprints. The fingerprint algorithm combines error message, top stack trace line, and route (if available) into a SHA256 hash. Same error → same fingerprint → same issue. Different errors → different fingerprints → different issues.

The fingerprinting logic extracts the first non-empty stack frame, normalizes function names, and combines with error message and route. This ensures that identical errors across different requests group together, while semantically different errors remain separate.

## Incident Lifecycle

Issues transition through states: `open` → `resolved` → `open` (regressed). When a DEPLOY or CONFIG_CHANGE event occurs, the system checks all open issues for the same service. If no matching errors occur after the trigger event (based on fingerprint comparison), the issue is marked resolved.

If a resolved issue sees new errors with the same fingerprint, it regresses—status returns to `open`, regression count increments, resolution metadata is cleared. This tracks recurring problems that weren't fully fixed.

## Impact & Priority Computation

Impact metrics are computed from related events: unique routes affected, unique users impacted (if available), and error rate (errors per minute over the last 60 minutes). Severity escalates based on error message keywords, count thresholds, error rate, regression count, and route diversity.

Priority score (0-100) combines severity base score, error rate component, regression component, and recency component. Resolved issues are weighted down. The score is capped at 100 and includes a human-readable reason explaining why the issue has high priority.

## Deterministic Logic

All correlation and grouping logic is deterministic and explainable. No machine learning, no black boxes. The 5-minute correlation window is rule-based: if an ERROR occurs within 5 minutes after a DEPLOY or CONFIG_CHANGE in the same service, it's flagged as likely caused by that trigger.

This approach covers approximately 80% of common incident patterns. The remaining 20% require more sophisticated analysis, but for an MVP, explainable rules beat opaque models.

## Why No Database

In-memory storage was chosen for hackathon scope. No database setup, faster development, sufficient for demo workloads. Data is lost on restart, which is acceptable for a proof-of-concept. Production deployment would require persistent storage, but the current architecture makes that transition straightforward—the storage interface is abstracted, so swapping implementations is trivial.

## API Design

The API follows REST conventions with minimal ceremony. Endpoints are organized by resource: `/events` for event CRUD, `/events/timeline/:serviceName` for correlated timeline views, `/issues` for issue listing and needs-attention queries. No authentication (hackathon scope), no rate limiting, no versioning.

Error responses are JSON with `error` and optional `message` fields. Success responses include the requested data and metadata (counts, correlation windows, etc.).
