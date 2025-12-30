import { TimelineEvent, EventType } from '../types/event';
import { LikelyCauseBadge } from './LikelyCauseBadge';

interface TimelineViewProps {
  events: TimelineEvent[];
  loading?: boolean;
  highlightedEventIds?: Set<string>;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getEventTypeBorderColor(eventType: EventType): string {
  switch (eventType) {
    case EventType.ERROR:
      return 'border-l-red-600';
    case EventType.DEPLOY:
      return 'border-l-sky-400';
    case EventType.CONFIG_CHANGE:
      return 'border-l-yellow-400';
    default:
      return 'border-l-slate-700';
  }
}

function getEventTypeDotColor(eventType: EventType): string {
  switch (eventType) {
    case EventType.ERROR:
      return 'bg-red-600';
    case EventType.DEPLOY:
      return 'bg-sky-400';
    case EventType.CONFIG_CHANGE:
      return 'bg-yellow-400';
    default:
      return 'bg-slate-700';
  }
}

function getEventTypeLabel(eventType: EventType): string {
  switch (eventType) {
    case EventType.ERROR:
      return 'ERROR';
    case EventType.DEPLOY:
      return 'DEPLOY';
    case EventType.CONFIG_CHANGE:
      return 'CONFIG_CHANGE';
    default:
      return eventType;
  }
}

export function TimelineView({ events, loading, highlightedEventIds }: TimelineViewProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading timeline...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No events found. Select a service to view its timeline.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-800" />
      
      <div className="space-y-6">
        {events.map((event, index) => {
          const isHighlighted = highlightedEventIds?.has(event.id);
          const borderColor = getEventTypeBorderColor(event.eventType);
          const dotColor = getEventTypeDotColor(event.eventType);
          
          return (
            <div key={event.id} id={`event-${event.id}`} className="relative">
              <div className={`absolute -left-[1.625rem] top-1.5 w-2 h-2 rounded-full ${dotColor} ${
                event.isLikelyCause ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-950' : ''
              }`} />
              
              <div
                className={`p-6 bg-slate-950 border-l-4 ${borderColor} border border-slate-800 rounded-lg transition-all duration-300 ${
                  event.isLikelyCause ? 'bg-slate-900/50' : ''
                } ${
                  isHighlighted ? 'ring-2 ring-sky-400 bg-slate-900/70' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-200">
                        {getEventTypeLabel(event.eventType)}
                      </span>
                      {event.isLikelyCause && <LikelyCauseBadge />}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {formatTimestamp(event.timestamp)}
                    </div>
                    {event.message && (
                      <div className="text-sm text-gray-300 mb-2">
                        {event.message}
                      </div>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                          View metadata
                        </summary>
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-slate-900 border border-slate-800 rounded">
                          <pre className="whitespace-pre-wrap font-mono text-gray-400">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

