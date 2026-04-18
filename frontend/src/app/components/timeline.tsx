import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TimelineEvent, Issue } from './types';
import { typeColor, statusColor } from './tokens';

interface TimelineProps {
  events: TimelineEvent[];
  allEvents: TimelineEvent[];
  selectedIssue: Issue | null;
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
}

type Phase = 'before' | 'incident' | 'after';

function classifyPhase(event: TimelineEvent, issue: Issue, allEvents: TimelineEvent[]): Phase {
  const rootCause = issue.rootCauseEventId
    ? allEvents.find(e => e.id === issue.rootCauseEventId)
    : null;
  if (!rootCause) return 'incident';

  const eventTime = new Date(event.timestamp).getTime();
  const rootTime = new Date(rootCause.timestamp).getTime();

  if (event.id === rootCause.id) return 'incident';
  if (event.type === 'error') return 'incident';
  if (eventTime < rootTime) return 'before';

  const issueErrors = issue.eventIds
    .map(id => allEvents.find(e => e.id === id))
    .filter(e => e && e.type === 'error')
    .map(e => new Date(e!.timestamp).getTime());
  const lastErrorTime = Math.max(...issueErrors, rootTime);
  if (eventTime > lastErrorTime) return 'after';
  return 'incident';
}

const phaseLabels: Record<Phase, string> = {
  before: 'What changed before',
  incident: 'What broke',
  after: 'What was done',
};

export function Timeline({ events, allEvents, selectedIssue, selectedEventId, onSelectEvent }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const highlightedIds = selectedIssue?.eventIds ?? [];
  const hasHighlight = highlightedIds.length > 0;
  const rootCauseId = selectedIssue?.rootCauseEventId;

  useEffect(() => {
    if (hasHighlight && highlightedIds[0] && scrollRef.current) {
      const el = eventRefs.current[highlightedIds[0]];
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
  }, [selectedIssue?.id]);

  const setEventRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    eventRefs.current[id] = el;
  }, []);

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const eventPhases = useMemo(() => {
    if (!selectedIssue) return new Map<string, Phase>();
    const map = new Map<string, Phase>();
    events.forEach(e => {
      if (highlightedIds.includes(e.id)) map.set(e.id, classifyPhase(e, selectedIssue, allEvents));
    });
    return map;
  }, [selectedIssue, events, highlightedIds, allEvents]);

  const rootCauseEvent = rootCauseId ? allEvents.find(e => e.id === rootCauseId) : null;

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--to-success)' }} />
        <div className="text-center">
          <div className="text-[13px] mb-1" style={{ color: 'var(--to-text-3)' }}>No events found</div>
          <div className="text-[11px]" style={{ color: 'var(--to-text-5)' }}>Try a wider time range or different service</div>
        </div>
      </div>
    );
  }

  let phaseGroups: { phase: Phase; events: TimelineEvent[] }[] = [];
  if (hasHighlight) {
    const highlighted = events.filter(e => highlightedIds.includes(e.id));
    (['before', 'incident', 'after'] as Phase[]).forEach(phase => {
      const phaseEvents = highlighted.filter(e => eventPhases.get(e.id) === phase);
      if (phaseEvents.length > 0) phaseGroups.push({ phase, events: phaseEvents });
    });
  }

  const renderEvent = (event: TimelineEvent, opts: { isDimmed: boolean }) => {
    const { isDimmed } = opts;
    const isSelected = selectedEventId === event.id;
    const isHovered = hoveredId === event.id;
    const isRootCause = rootCauseId === event.id;
    const isHighlighted = highlightedIds.includes(event.id);

    return (
      <div key={event.id} ref={setEventRef(event.id)} className="relative">
        {/* Timestamp */}
        <div className="absolute -left-[72px] w-[60px] text-right top-[10px]">
          <span
            className="text-[10px] font-mono tabular-nums transition-colors duration-150"
            style={{
              color: isDimmed
                ? 'var(--to-text-ghost)'
                : isHighlighted || isSelected
                ? 'var(--to-text-3)'
                : 'var(--to-text-4)',
            }}
          >
            {formatTime(event.timestamp)}
          </span>
        </div>

        {/* Dot */}
        <div className="absolute left-0 top-[10px] -translate-x-1/2 z-10">
          {isRootCause ? (
            <div className="relative flex items-center justify-center">
              <div className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: typeColor[event.type] }} />
              <div
                className="absolute w-[17px] h-[17px] rounded-full opacity-30"
                style={{ border: `1.5px solid`, borderColor: typeColor[event.type] }}
              />
            </div>
          ) : (
            <div
              className="w-[7px] h-[7px] rounded-full transition-all duration-150"
              style={{
                backgroundColor: isDimmed ? 'var(--to-text-ghost)' : typeColor[event.type],
                opacity: isDimmed ? 0.6 : 1,
                transform: isHovered && !isDimmed ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          )}
        </div>

        {/* Content */}
        <button
          onClick={() => onSelectEvent(isSelected ? null : event.id)}
          onMouseEnter={() => setHoveredId(event.id)}
          onMouseLeave={() => setHoveredId(null)}
          className="w-full text-left pl-6 pr-4 py-2 rounded-[5px] transition-all duration-150"
          style={{
            minHeight: 44,
            opacity: isDimmed ? 0.12 : 1,
            pointerEvents: isDimmed ? 'none' : 'auto',
            backgroundColor: isSelected ? 'var(--to-bg-elevated)' : 'transparent',
          }}
          onMouseEnterCapture={e => {
            if (!isDimmed && !isSelected) e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)';
          }}
          onMouseLeaveCapture={e => {
            if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'var(--to-bg-elevated)' : 'transparent';
          }}
          disabled={isDimmed}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[12.5px] leading-[1.4] transition-colors duration-150"
              style={{
                fontWeight: isRootCause || isSelected ? 500 : 400,
                color: isSelected
                  ? 'var(--to-text-1)'
                  : isHovered
                  ? 'var(--to-text-1)'
                  : isHighlighted
                  ? 'var(--to-text-2)'
                  : 'var(--to-text-3)',
              }}
            >
              {event.title}
            </span>

            {isRootCause && (
              <span
                className="text-[8.5px] px-1.5 py-[1px] rounded-[3px] uppercase tracking-[0.06em] shrink-0"
                style={{
                  color: 'var(--to-error)',
                  backgroundColor: 'var(--to-error-subtle)',
                  border: '1px solid var(--to-error-border)',
                }}
              >
                Trigger
              </span>
            )}

            <span className="flex-1" />

            <span
              className="text-[10px] transition-colors duration-150 shrink-0"
              style={{ color: isSelected || isHovered ? 'var(--to-text-3)' : 'var(--to-text-5)' }}
            >
              {event.service}
            </span>
          </div>

          {/* Smooth expand description on hover/select */}
          <div
            className="grid transition-all duration-200 ease-out"
            style={{
              gridTemplateRows: (isHovered || isSelected) && !isDimmed ? '1fr' : '0fr',
              opacity: (isHovered || isSelected) && !isDimmed ? 1 : 0,
            }}
          >
            <div className="overflow-hidden">
              <div className="pt-1 pb-0.5 text-[11px] leading-[1.5] max-w-[480px]" style={{ color: 'var(--to-text-3)' }}>
                {event.description}
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none">
      {/* Story Header */}
      <div className="px-8 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
        {selectedIssue ? (
          <div>
            <h2
              className="text-[16px] leading-[1.3] mb-1.5"
              style={{ fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--to-text-1)' }}
            >
              {selectedIssue.title}
            </h2>
            <p className="text-[12px] leading-[1.5] mb-3 max-w-[520px]" style={{ color: 'var(--to-text-3)' }}>
              {selectedIssue.causeSummary}
            </p>
            <div className="flex items-center gap-4 text-[10px]">
              {rootCauseEvent && (
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--to-text-4)' }}>Cause</span>
                  <span style={{ color: 'var(--to-text-2)' }}>{rootCauseEvent.title}</span>
                </div>
              )}
              <div className="w-px h-3" style={{ backgroundColor: 'var(--to-border)' }} />
              <div className="flex items-center gap-1.5">
                <span style={{ color: 'var(--to-text-4)' }}>Detected</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--to-text-2)' }}>
                  {formatTime(selectedIssue.firstSeen)}
                </span>
              </div>
              <div className="w-px h-3" style={{ backgroundColor: 'var(--to-border)' }} />
              <div className="flex items-center gap-1.5">
                <span style={{ color: 'var(--to-text-4)' }}>Impact</span>
                <span style={{ color: 'var(--to-text-2)' }}>{selectedIssue.impactLabel}</span>
              </div>
              <div className="w-px h-3" style={{ backgroundColor: 'var(--to-border)' }} />
              <div className="flex items-center gap-1.5">
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ backgroundColor: statusColor[selectedIssue.status] }}
                />
                <span className="capitalize" style={{ color: statusColor[selectedIssue.status] }}>
                  {selectedIssue.status}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[12px] mb-0.5" style={{ color: 'var(--to-text-3)' }}>
              {events.length} events
            </div>
            <div className="text-[10px]" style={{ color: 'var(--to-text-5)' }}>
              Select an issue to investigate
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="px-8 py-4">
          {hasHighlight ? (
            <div>
              {phaseGroups.map(({ phase, events: phaseEvents }) => (
                <div key={phase} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-3 mb-3 ml-[72px]">
                    <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--to-text-3)' }}>
                      {phaseLabels[phase]}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--to-border-subtle)' }} />
                  </div>
                  <div className="relative ml-[72px]">
                    <div
                      className="absolute left-[3.5px] top-2 bottom-2 w-px"
                      style={{ backgroundColor: 'var(--to-border)' }}
                    />
                    {phaseEvents.map(event => renderEvent(event, { isDimmed: false }))}
                  </div>
                </div>
              ))}

              {events.filter(e => !highlightedIds.includes(e.id)).length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3 ml-[72px]">
                    <span className="text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--to-text-5)' }}>
                      Other events
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--to-border-subtle)' }} />
                  </div>
                  <div className="relative ml-[72px]">
                    <div
                      className="absolute left-[3.5px] top-2 bottom-2 w-px"
                      style={{ backgroundColor: 'var(--to-border-subtle)' }}
                    />
                    {events.filter(e => !highlightedIds.includes(e.id)).map(event =>
                      renderEvent(event, { isDimmed: true })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative ml-[72px]">
              <div
                className="absolute left-[3.5px] top-2 bottom-2 w-px"
                style={{ backgroundColor: 'var(--to-border)' }}
              />
              {events.map(event => renderEvent(event, { isDimmed: false }))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
