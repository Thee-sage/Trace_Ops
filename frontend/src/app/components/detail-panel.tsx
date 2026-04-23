import { X, ArrowRight } from 'lucide-react';
import type { TimelineEvent, Issue } from './types';
import { typeColor, statusColor } from './tokens';
import { LogViewer } from './log-viewer';

interface DetailPanelProps {
  event: TimelineEvent | null;
  issue: Issue | null;
  allEvents: TimelineEvent[];
  onClose: () => void;
  onSelectEvent: (id: string) => void;
  isMobile?: boolean;
  isWide?: boolean;
}

function generateExplanation(event: TimelineEvent, issue: Issue | null, allEvents: TimelineEvent[]): string {
  if (event.suggestedCause) return event.suggestedCause;
  if (!issue) {
    if (event.type === 'error') return `An error was detected in ${event.service}. ${event.description}`;
    if (event.type === 'deployment') return `A deployment was made to ${event.service}. Review whether this change is related to any ongoing issues.`;
    return `A configuration change was applied to ${event.service}. Verify whether this was intentional or related to an incident.`;
  }
  const rootCause = issue.rootCauseEventId ? allEvents.find(e => e.id === issue.rootCauseEventId) : null;
  if (rootCause && rootCause.id !== event.id) {
    if (event.type === 'error') return `This error is a downstream consequence of "${rootCause.title}". Resolving the root cause should eliminate this symptom.`;
    if (event.type === 'deployment') return `This deployment was likely a mitigation response to the incident. It occurred after the root cause event.`;
    return `This configuration change occurred during the incident window. It may be an attempted fix by the on-call team.`;
  }
  return event.description;
}

export function DetailPanel({ event, issue, allEvents, onClose, onSelectEvent, isMobile, isWide }: DetailPanelProps) {
  if (!event && !issue) return null;

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const formatFullDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const relatedEvents = issue
    ? allEvents.filter(e => issue.eventIds.includes(e.id))
    : event
    ? allEvents.filter(e => e.issueIds.some(iid => event.issueIds.includes(iid)) && e.id !== event.id)
    : [];

  const rootCauseEvent = issue?.rootCauseEventId ? allEvents.find(e => e.id === issue.rootCauseEventId) : null;
  const explanation = event ? generateExplanation(event, issue, allEvents) : null;
  const isRootCause = event && issue?.rootCauseEventId === event.id;

  return (
    <aside
      className={isMobile ? 'flex flex-col flex-1 select-none overflow-hidden' : 'shrink-0 flex flex-col select-none'}
      style={{
        width: isMobile ? undefined : isWide ? '380px' : '340px',
        backgroundColor: 'var(--to-bg-panel)',
        borderLeft: isMobile ? 'none' : '1px solid var(--to-border)',
      }}
    >
      {/* Header */}
      {!isMobile && (
      <div
        className="px-4 h-10 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--to-border)' }}
      >
        <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--to-text-3)' }}>
          {event ? 'Why this happened' : 'Investigation'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-[4px] transition-colors duration-150"
          style={{ color: 'var(--to-text-4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--to-text-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--to-text-4)'; }}
        >
          <X size={13} />
        </button>
      </div>
      )}

      <div className="flex-1 overflow-y-auto">

        {/* Event detail */}
        {event && (
          <>
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
              {isRootCause && (
                <div className="mb-2.5">
                  <span
                    className="text-[9px] px-1.5 py-[2px] rounded-[3px] uppercase tracking-[0.06em]"
                    style={{
                      color: 'var(--to-error)',
                      backgroundColor: 'var(--to-error-subtle)',
                      border: '1px solid var(--to-error-border)',
                    }}
                  >
                    Root cause
                  </span>
                </div>
              )}

              <h3 className="text-[15px] leading-[1.35] mb-2" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                {event.title}
              </h3>

              <div className="flex items-center gap-2 text-[10px] mb-3">
                <span style={{ color: 'var(--to-text-3)' }}>{event.service}</span>
                <span style={{ color: 'var(--to-text-5)' }}>&middot;</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--to-text-4)' }}>
                  {formatFullDate(event.timestamp)}
                </span>
              </div>

              <div
                className="px-3 py-2.5 rounded-[4px] border-l-[2px]"
                style={{
                  backgroundColor: 'var(--to-bg-surface)',
                  borderLeftColor: isRootCause ? 'var(--to-callout-border)' : 'var(--to-insight-border)',
                }}
              >
                <p className="text-[11.5px] leading-[1.6]" style={{ color: 'var(--to-text-2)' }}>
                  {explanation}
                </p>
              </div>
            </div>

            {Object.keys(event.metadata).length > 0 && (
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
                <span className="text-[9px] uppercase tracking-[0.08em] block mb-2.5" style={{ color: 'var(--to-text-5)' }}>
                  Supporting data
                </span>
                <div className="space-y-1.5">
                  {Object.entries(event.metadata).map(([k, v]) => (
                    <div key={k} className={`flex gap-4 ${String(v).length > 40 ? 'flex-col' : 'items-baseline justify-between'}`}>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--to-text-4)' }}>
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono break-words" style={{ color: 'var(--to-text-2)', wordBreak: 'break-word', textAlign: String(v).length > 40 ? 'left' : 'right' }}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log Entry */}
            {event.logEntry && (
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
                <span className="text-[9px] uppercase tracking-[0.08em] block mb-2.5" style={{ color: 'var(--to-text-5)' }}>
                  Log output
                </span>
                <LogViewer log={event.logEntry} />
              </div>
            )}

            {relatedEvents.filter(re => re.id !== event.id).length > 0 && (
              <div className="px-5 py-3.5">
                <span className="text-[9px] uppercase tracking-[0.08em] block mb-2.5" style={{ color: 'var(--to-text-5)' }}>
                  Other events in this incident
                </span>
                <div className="space-y-0.5">
                  {relatedEvents.filter(re => re.id !== event.id).map(re => (
                    <button
                      key={re.id}
                      onClick={() => onSelectEvent(re.id)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-[4px] transition-colors duration-150 group"
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--to-bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: typeColor[re.type] }} />
                      <span className="text-[11px] flex-1 truncate transition-colors duration-150" style={{ color: 'var(--to-text-3)' }}>
                        {re.title}
                      </span>
                      <span className="text-[9px] font-mono tabular-nums shrink-0" style={{ color: 'var(--to-text-5)' }}>
                        {formatTime(re.timestamp)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Issue overview */}
        {!event && issue && (
          <>
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: statusColor[issue.status] }} />
                <span className="text-[10px] capitalize" style={{ color: statusColor[issue.status] }}>
                  {issue.status}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--to-text-5)' }}>&middot;</span>
                <span className="text-[10px]" style={{ color: 'var(--to-text-3)' }}>{issue.impactLabel}</span>
              </div>

              <h3 className="text-[15px] leading-[1.35] mb-2.5" style={{ fontWeight: 500, color: 'var(--to-text-1)' }}>
                {issue.title}
              </h3>

              <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--to-text-3)' }}>
                {issue.summary}
              </p>
            </div>

            {rootCauseEvent && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--to-border-subtle)' }}>
                <span className="text-[9px] uppercase tracking-[0.08em] block mb-2.5" style={{ color: 'var(--to-error)' }}>
                  Identified trigger
                </span>
                <button
                  onClick={() => onSelectEvent(rootCauseEvent.id)}
                  className="w-full text-left group p-3 rounded-[5px] transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--to-bg-surface)',
                    border: '1px solid var(--to-border)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--to-text-5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--to-border)'; }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: typeColor[rootCauseEvent.type] }} />
                    <span className="text-[12px] transition-colors duration-150" style={{ color: 'var(--to-text-2)' }}>
                      {rootCauseEvent.title}
                    </span>
                    <ArrowRight size={10} className="ml-auto transition-colors duration-150" style={{ color: 'var(--to-text-5)' }} />
                  </div>
                  <p className="text-[11px] leading-[1.55] pl-[13px]" style={{ color: 'var(--to-text-4)' }}>
                    {rootCauseEvent.suggestedCause || rootCauseEvent.description}
                  </p>
                </button>
              </div>
            )}

            {relatedEvents.length > 0 && (
              <div className="px-5 py-3.5">
                <span className="text-[9px] uppercase tracking-[0.08em] block mb-2.5" style={{ color: 'var(--to-text-5)' }}>
                  Event sequence
                </span>
                <div className="relative ml-1">
                  <div className="absolute left-[2.5px] top-2 bottom-2 w-px" style={{ backgroundColor: 'var(--to-border)' }} />
                  {relatedEvents.map(re => (
                    <button
                      key={re.id}
                      onClick={() => onSelectEvent(re.id)}
                      className="relative pl-5 pb-3 w-full text-left group last:pb-0"
                    >
                      <div className="absolute left-0 top-[5px]">
                        <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: typeColor[re.type] }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] transition-colors duration-150" style={{ color: 'var(--to-text-3)' }}>
                          {re.title}
                        </span>
                        {issue.rootCauseEventId === re.id && (
                          <span className="text-[8px] uppercase tracking-[0.06em]" style={{ color: 'var(--to-error)' }}>
                            trigger
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--to-text-5)' }}>
                          {formatTime(re.timestamp)}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--to-text-ghost)' }}>{re.service}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
