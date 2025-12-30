# TraceOps Verification Harness

Test harness validating all four stages of TraceOps functionality.

## Purpose

This folder exists to prove TraceOps works end-to-end. It's not a unit test suite or integration test framework—it's a minimal Express application that exercises TraceOps SDK capture, backend grouping, lifecycle tracking, and priority computation.

## What It Validates

**Stage 1 - Capture**: Automatic event capture on server start (DEPLOY), route errors (ERROR), and environment changes (CONFIG_CHANGE). No manual API calls required.

**Stage 2 - Grouping**: Identical errors group into the same issue with incrementing count. Different errors create separate issues. Fingerprinting is deterministic.

**Stage 3 - Lifecycle**: Issues transition from open → resolved (after deploy/config change with no matching errors) → regressed (when errors return). Regression count increments correctly.

**Stage 4 - Impact & Signal**: Error rate is computed from recent events. Severity escalates based on rules. Priority score combines severity, error rate, regression count, and recency. "Needs Attention" panel surfaces top-priority issues.

## How It Works

The verification app is a minimal Express server with TraceOps SDK initialized. Routes throw errors to simulate incidents. The SDK captures these automatically. The backend groups them into issues, tracks lifecycle, and computes priorities. The frontend displays results.

No business logic exists in this app—it's purely a test harness. All event capture happens automatically via SDK hooks. If events don't appear in TraceOps, the SDK or backend is not working correctly.

## Testing Phases

**Phase 1 - Capture**: Start the server. Verify DEPLOY event appears in TraceOps timeline.

**Phase 2 - Grouping**: Call `/error/same` multiple times. Verify one issue with count = N appears. Call `/error/different`. Verify a second issue appears.

**Phase 3 - Lifecycle**: Trigger errors, restart server (triggers DEPLOY), don't trigger more errors. Verify issue resolves. Trigger errors again. Verify issue regresses with incremented regression count.

**Phase 4 - Impact**: Call `/load/heavy` rapidly (5-10 times in quick succession). Verify error rate increases, severity escalates, priority score rises, issue appears in "Needs Attention" panel.

## Setup

```bash
npm install
npm start
```

Ensure TraceOps backend is running and accessible. Update `TRACEOPS_ENDPOINT` in environment if needed.

## Endpoints

- `GET /error/same` - Throws deterministic error (groups into same issue)
- `GET /error/different` - Throws different error (creates separate issue)
- `GET /error/critical` - Throws error with "critical" keyword (triggers high severity)
- `GET /load/light` - Single error (low priority)
- `GET /load/heavy` - Single error (call multiple times rapidly for high priority)
- `GET /config/test` - Returns current TEST_VALUE (change in .env and restart to trigger CONFIG_CHANGE)

## How Reviewers Should Test

1. Start TraceOps backend and frontend.
2. Start verification app (`npm start` in this folder).
3. Open TraceOps frontend, select `traceops-verify-app` service.
4. Follow testing phases above, verifying each stage in the UI.
5. Check that events appear automatically (no manual API calls needed).
6. Verify issue grouping, lifecycle transitions, and priority computation match expectations.

The verification app is the canonical proof that TraceOps works. If it doesn't work here, it doesn't work anywhere.
