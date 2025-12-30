# TraceOps

Incident timeline and root-cause engine for cloud applications.

## What TraceOps Is

TraceOps transforms incident investigation from a 15-minute log-sifting nightmare into a 2-minute timeline review. When production breaks, engineers face scattered logs across multiple services, manual timestamp correlation, and cognitive overload. TraceOps provides a unified chronological timeline that automatically correlates events and highlights likely root causes.

The core idea is simple: timeline → issues → lifecycle → prioritization. Events flow from SDK capture into the backend, where they're grouped into issues, tracked through resolution cycles, and prioritized by impact. The frontend visualizes this as a decision-making interface, not a dashboard.

## What TraceOps Is Not

TraceOps is not a log viewer. It doesn't replace CloudWatch or Datadog. It doesn't aggregate metrics or provide alerting. It doesn't try to be everything to everyone. Instead, it solves one specific problem: reducing the time between "something broke" and "here's what likely caused it."

## How It Works

**Backend** ingests events, groups errors into issues using deterministic fingerprints, tracks issue lifecycle (open → resolved → regressed), and computes impact metrics. Logic is rule-based and explainable—no black boxes.

**Frontend** visualizes timelines chronologically, highlights correlated events, surfaces issues needing attention, and enables quick causality navigation. The UI focuses on decision-making, not data exploration.

**SDK** captures errors, deployments, and configuration changes automatically. One-line integration. No manual logging required.

**Verify** provides a test harness that validates all four stages: capture, grouping, lifecycle, and impact computation.

## Architecture Overview

```
SDK → Backend → Issues → Frontend
```

Events flow from application code (via SDK) into the backend storage layer. The backend groups errors into issues, correlates them with deployments and config changes, tracks resolution cycles, and computes priority scores. The frontend consumes this processed data and presents it as an actionable timeline.

Each component is independently deployable. The backend stores events in-memory (by design, for hackathon scope). The frontend polls for updates. The SDK is framework-agnostic but optimized for Node.js and Express.

## Project Structure

- `backend/` - Event ingestion, issue grouping, lifecycle tracking, priority computation
- `frontend/` - Timeline visualization, issue highlighting, needs attention panel
- `client/` - TraceOps SDK for automatic event capture
- `verify-traceops/` - Test harness validating all system stages
- `kiro/` - Architectural documentation and design decisions

See each folder's README for detailed architecture and responsibilities.
