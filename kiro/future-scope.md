# Future Scope

Realistic extensions beyond the MVP.

## Database Persistence

Replace in-memory storage with PostgreSQL or similar. Add event retention policies, indexing for fast queries, and backup/recovery. This enables historical analysis and production-scale workloads.

The current storage interface is abstracted, so swapping implementations is straightforward. The Map-based API can be replaced with database queries without changing business logic.

## Authentication & Teams

Add user authentication (OAuth, API keys, or session-based). Support multi-tenant deployments with team isolation. Add role-based access control (read-only, admin, etc.).

This requires changes to API layer (auth middleware) and frontend (login flow), but core event processing logic remains unchanged.

## Alerting Hooks

Integrate with PagerDuty, Slack, email, or webhooks. Send notifications when high-priority issues are created or when issues regress. Allow users to configure alert rules (severity thresholds, service filters, etc.).

This is a new layer on top of existing priority computation—no changes to core logic required.

## GitHub / CI Integration

Automatically create DEPLOY events from GitHub Actions, CircleCI, or other CI/CD pipelines. Link deployments to commit hashes, pull requests, and release tags. Show deployment context in timeline view.

This requires SDK extensions or webhook endpoints, but event model already supports this metadata.

## Ethereum Anchoring

Anchor incident timelines to Ethereum blockchain for immutable audit trails. Hash timeline data and store on-chain. Enable compliance and audit requirements (SOC 2, ISO 27001).

Basic blockchain integration already exists in the codebase (TimelineAnchor contract). This can be extended to anchor issue resolutions and priority changes, not just timelines.

## Multi-Service Correlation

Extend correlation beyond single-service boundaries. Use service dependency graphs to track cascading failures. Visualize cross-service impact in timeline view.

This requires dependency graph data (from service mesh, API gateway, or manual configuration) and enhanced correlation logic, but core grouping and lifecycle tracking remain the same.

## Historical Analysis

Add time-series queries for issue trends, error rate patterns, and resolution time metrics. Enable "what happened last week?" queries and trend visualization.

This requires database persistence and time-series indexing, but query logic can be built on top of existing event and issue models.

## Advanced Filtering

Add complex filters (time ranges, severity levels, service combinations, keyword search). Enable saved filter presets and filter sharing.

This is a UI enhancement—backend already supports basic filtering. Advanced filters require query builder UI and enhanced API endpoints.

## Real-Time Updates

Replace polling with WebSocket or Server-Sent Events. Push timeline and issue updates to frontend as they occur. Reduce latency from 5 seconds to sub-second.

This requires WebSocket server implementation and connection management, but event processing logic remains unchanged.

## Custom Correlation Rules

Allow users to define custom correlation rules beyond the default 5-minute window. Support service-specific windows, custom event type relationships, and pattern matching.

This requires rule engine and configuration UI, but core correlation algorithm can be parameterized to support custom rules.

