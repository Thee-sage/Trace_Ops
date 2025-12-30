# Architecture

## High-Level System Flow

```
Application Code → SDK → Backend API → Storage → Grouping → Lifecycle → Priority → Frontend
```

Events flow from application code (via SDK hooks) into the backend HTTP API. The backend stores events in-memory, groups errors into issues using deterministic fingerprints, tracks issue lifecycle through resolution cycles, and computes priority scores based on impact metrics. The frontend consumes this processed data and visualizes it as an actionable timeline.

## Component Responsibilities

**SDK Layer**: Captures events automatically via process hooks and Express middleware. No manual instrumentation required. Sends events to backend API synchronously (fire-and-forget).

**Backend API Layer**: Receives events via HTTP, validates payloads, stores in-memory Map structure. Provides endpoints for timeline retrieval (with correlation flags) and issue queries (with priority ranking).

**Storage Layer**: In-memory Map<string, Event> with filtering by service, type, and time range. No persistence—data lost on restart. Intentional choice for hackathon scope.

**Grouping Layer**: Fingerprints errors using message + stack trace + route, groups identical fingerprints into issues, tracks issue metadata (count, first seen, last seen).

**Lifecycle Layer**: Monitors DEPLOY and CONFIG_CHANGE events, checks for matching errors after triggers, marks issues resolved if no matches found, tracks regression when resolved issues see new errors.

**Priority Layer**: Computes impact metrics (error rate, unique routes, unique users), determines severity based on escalation rules, calculates priority score (0-100) with human-readable reasons.

**Frontend Layer**: Visualizes timeline chronologically, highlights correlated events, surfaces needs-attention issues, enables quick navigation between issues and events.

## Separation of Concerns

Each layer has a single responsibility. The SDK doesn't know about issues—it just captures events. The backend doesn't know about UI—it just processes data. The frontend doesn't know about correlation logic—it just displays flags. This separation enables independent evolution and testing.

## Data Flow Example

1. Application throws error → SDK captures → POST /events
2. Backend receives → Storage.create() → Fingerprint generated → Issue lookup
3. If issue exists → Issue.increment() → Metrics recomputed → Priority updated
4. Frontend polls → GET /issues/needs-attention → Renders priority cards
5. User clicks issue → GET /events/timeline/:service → Highlights related events

Each step is independent and testable. The system is designed for clarity over optimization.
