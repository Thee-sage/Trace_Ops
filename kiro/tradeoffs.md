# Tradeoffs

Intentional decisions and their rationale.

## No Machine Learning

**Decision**: Rule-based correlation instead of ML models.

**Rationale**: ML requires training data, is harder to debug, and is less explainable. Rule-based logic covers 80% of common patterns, is deterministic, and can be understood by any engineer. For an MVP, explainability beats sophistication.

**Tradeoff**: Less accurate for edge cases, but sufficient for common incident patterns. ML can be added later without changing core architecture.

## No Alerts

**Decision**: TraceOps does not send alerts or notifications.

**Rationale**: Alerting is a separate concern. TraceOps focuses on investigation, not detection. Engineers can integrate TraceOps with existing alerting systems if needed, but the core product doesn't duplicate that functionality.

**Tradeoff**: Users must check TraceOps manually or build their own alerting integration. This keeps the product focused and avoids alert fatigue.

## No Database

**Decision**: In-memory storage using Map<string, Event>.

**Rationale**: Faster to implement, no setup required, sufficient for demo workloads. Database adds complexity (migrations, connection pooling, query optimization) without providing value for hackathon scope.

**Tradeoff**: Data lost on restart. Acceptable for proof-of-concept. Production deployment would require persistent storage, but storage interface is abstracted for easy migration.

## Polling Over Sockets

**Decision**: Frontend polls backend every 5 seconds instead of WebSocket/SSE.

**Rationale**: Simpler implementation, works reliably, 5-second latency acceptable for incident investigation. Real-time updates are nice-to-have, not essential.

**Tradeoff**: Slight delay in updates, but reduces complexity and eliminates connection management issues. Can be upgraded to WebSocket later if needed.

## In-Memory Storage

**Decision**: Events and issues stored in process memory, not persisted to disk.

**Rationale**: Zero setup, fast access, sufficient for demo. Persistence adds complexity (file I/O, serialization, recovery) without providing value for hackathon scope.

**Tradeoff**: Data lost on restart. Acceptable for proof-of-concept. Production would require database, but current architecture makes that transition straightforward.

## Single-Service Timeline

**Decision**: Timeline view shows one service at a time, not multi-service correlation.

**Rationale**: Simpler UI, easier to understand, reduces cognitive load. Multi-service correlation requires dependency graphs and is a natural extension.

**Tradeoff**: Can't see cross-service relationships easily, but most incidents are service-local. Multi-service view can be added later without changing core logic.

## Rule-Based Correlation

**Decision**: 5-minute time window correlation, not pattern matching or ML.

**Rationale**: Explainable, deterministic, covers 80% of cases. Complex patterns require more sophisticated analysis, but for MVP, simple rules are sufficient.

**Tradeoff**: May miss slow failures or complex cascades, but catches most common patterns. More sophisticated correlation can be added incrementally.

## No Authentication

**Decision**: Single-user, no auth required.

**Rationale**: Adds complexity, not needed for demo. Auth is a solved problem—can be added via reverse proxy or middleware if needed.

**Tradeoff**: Not suitable for multi-tenant deployment, but sufficient for single-team use. Auth can be added without changing core architecture.

## Deterministic Fingerprinting

**Decision**: SHA256 hash of message + stack + route, not fuzzy matching.

**Rationale**: Exact matching ensures identical errors group together, different errors stay separate. Fuzzy matching would group similar but distinct errors, reducing signal quality.

**Tradeoff**: Slight variations in error messages create separate issues, but this is correct behavior—different errors should be tracked separately.

## Silent Failure Model

**Decision**: SDK and backend fail silently if events can't be sent.

**Rationale**: Observability must never crash the application. If backend is down, events are lost, but application continues running. This is acceptable—observability is best-effort, not critical path.

**Tradeoff**: Events may be lost during outages, but application stability is more important. Can be improved with local buffering later if needed.

