# System Layers

TraceOps operates in four distinct layers, each with specific inputs, outputs, and failure modes.

## Layer 1: Capture

**Purpose**: Automatically capture events from application code without manual instrumentation.

**Inputs**: Process events (uncaught exceptions, unhandled rejections), Express route errors, process start signals, environment file changes.

**Outputs**: Event payloads sent to backend API (eventType, serviceName, timestamp, message, metadata).

**Failure Modes**: Backend unavailable (events lost silently), network errors (events lost silently), SDK not initialized (no capture). Failures are silent by design—observability must never crash the application.

**Implementation**: Node.js process hooks, Express error middleware, file system monitoring for .env changes.

## Layer 2: Grouping

**Purpose**: Group identical errors into issues using deterministic fingerprints.

**Inputs**: ERROR events with message, stack trace, and optional route metadata.

**Outputs**: Issues with fingerprint, count, first seen, last seen, related event IDs.

**Failure Modes**: Fingerprint collision (different errors grouped together—rare with SHA256), missing stack trace (fingerprint relies on message only—acceptable degradation), fingerprint generation failure (event skipped—logged but not fatal).

**Implementation**: SHA256 hash of normalized error message + top stack frame + route. Map-based lookup for existing issues by fingerprint key (serviceName:fingerprint).

## Layer 3: Lifecycle

**Purpose**: Track issue resolution and regression cycles.

**Inputs**: DEPLOY/CONFIG_CHANGE events, existing open issues, ERROR events after triggers.

**Outputs**: Issue status transitions (open → resolved → open), regression count increments, resolution metadata (resolvedAt, resolvedByEventId).

**Failure Modes**: Resolution check fails (issue remains open—acceptable, will resolve on next trigger), false resolution (matching error missed—rare, fingerprint comparison is exact), false regression (unrelated error triggers regression—acceptable, better to flag than miss).

**Implementation**: On DEPLOY/CONFIG_CHANGE, query all open issues for service, fetch ERROR events after trigger timestamp, compare fingerprints, mark resolved if no matches. On ERROR for resolved issue, increment regression count and reopen.

## Layer 4: Impact & Signal

**Purpose**: Compute impact metrics and prioritize issues for attention.

**Inputs**: Issue with related event IDs, event metadata (routes, users), time windows.

**Outputs**: Impact metrics (error rate, unique routes, unique users), severity level (low/medium/high/critical), priority score (0-100), priority reason (human-readable explanation).

**Failure Modes**: Metric computation failure (defaults to zero—acceptable degradation), missing metadata (routes/users undefined—acceptable, metrics computed from available data), stale metrics (not recomputed on every event—acceptable, recomputed on issue update).

**Implementation**: Error rate = recent errors (last 60 min) / time span in minutes. Severity escalates based on keywords, count thresholds, error rate, regression count, route diversity. Priority score = severity base (20-80) + error rate component (0-15) + regression component (0-10) + recency component (0-10), capped at 100.

