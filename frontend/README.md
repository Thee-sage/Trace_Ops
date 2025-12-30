# TraceOps Frontend

Timeline visualization and issue prioritization interface.

## Philosophy

The frontend is designed for decision-making, not data exploration. When an engineer opens TraceOps during an incident, they need answers fast: what broke, when did it break, what likely caused it, and what needs attention right now. The UI optimizes for these questions.

## Timeline Visualization

Events are displayed chronologically in a vertical timeline, oldest at top, newest at bottom. Each event shows type, timestamp, message, and optional metadata. Color coding provides immediate visual distinction: red for errors, blue for deployments, yellow for config changes.

The timeline is not a log viewer. It doesn't show every log line or support complex filtering. It shows the events that matter for root-cause analysis: deployments, config changes, and errors. Everything else is noise.

## Issues vs Events

The frontend distinguishes between events (raw data points) and issues (grouped error patterns). The timeline shows events. The issues panel shows grouped problems. Clicking an issue highlights related events in the timeline and scrolls to the most relevant event (suspected cause or first error).

This separation prevents cognitive overload. Engineers don't need to see 47 identical errors—they need to see "this issue occurred 47 times" and understand its lifecycle.

## Highlighting & Causality UX

When an issue is selected, related events are highlighted with a ring effect. The suspected cause event (if available) is scrolled into view. After 4 seconds, highlighting fades automatically. This provides immediate visual feedback without permanent distraction.

The correlation engine flags likely causes with a badge. These badges appear inline with events, not in a separate panel. The goal is to make causality obvious without requiring interpretation.

## Needs Attention Panel

The top section shows issues requiring immediate attention, sorted by priority score. This panel answers "what should I look at first?" without requiring the engineer to scan all issues. Priority scores are displayed as progress bars with color coding matching severity.

Each needs-attention card shows issue title, severity badge, priority score, occurrence count, error rate, affected routes, and regression status. The suspected cause is displayed inline if available. Clicking navigates to the timeline view with highlighting enabled.

## Decision-Making Focus

The UI deliberately avoids dashboard-style metrics, charts, or historical analysis. During an active incident, engineers need actionable information, not data exploration tools. The interface surfaces what matters: timeline sequence, issue grouping, causality hints, and priority ranking.

Filters are minimal. Service selection is the primary filter. Event type filtering exists but is secondary. Time range filtering is not exposed—the timeline shows all events for the selected service. This simplicity reduces decision fatigue.

## Polling Model

The frontend polls the backend every 5 seconds for timeline and issue updates. No WebSocket, no server-sent events, no real-time streaming. This choice was made for hackathon scope—polling is simpler, works reliably, and 5-second latency is acceptable for incident investigation.

The polling logic distinguishes between initial loads (shows loading state) and background refreshes (silent updates to avoid UI flicker). Error states are shown only for initial loads; background refresh failures are logged but don't disrupt the UI.

## Component Architecture

Components are organized by responsibility: `TimelineView` renders events, `IssuesView` renders issue lists, `NeedsAttentionView` renders priority cards, `ServiceSelector` handles service selection. State is managed at the App level using React hooks—no global state management library needed for this scope.

Styling uses Tailwind CSS for consistency and speed. No custom CSS files. Color palette is dark-themed (slate-950 background) for reduced eye strain during late-night incidents.
