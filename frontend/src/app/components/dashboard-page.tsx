import { useState, useMemo, useEffect } from 'react';
import { IssuesRail } from './issues-rail';
import { Timeline } from './timeline';
import { DetailPanel } from './detail-panel';
import { fetchEvents, fetchIssues } from './api';
import type { TimelineEvent, Issue } from './types';
import { AlertTriangle, List } from 'lucide-react';

interface DashboardPageProps {
  timeFilter: string;
  searchQuery: string;
  selectedService: string;
}

export function DashboardPage({ timeFilter, searchQuery, selectedService }: DashboardPageProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<'timeline' | 'issues'>('timeline');

  // Fetch data when service or time filter changes
  useEffect(() => {
    setLoading(true);
    setSelectedIssueId(null);
    setSelectedEventId(null);

    Promise.all([
      fetchEvents(selectedService, timeFilter),
      fetchIssues(selectedService),
    ])
      .then(([evts, iss]) => {
        setEvents(evts);
        setIssues(iss);
      })
      .catch(err => console.error('[TraceOps] Failed to fetch data:', err))
      .finally(() => setLoading(false));
  }, [selectedService, timeFilter]);

  const selectedIssue = useMemo(
    () => issues.find(i => i.id === selectedIssueId) ?? null,
    [selectedIssueId, issues]
  );

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedEventId) ?? null,
    [selectedEventId, events]
  );

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        e.service.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const handleSelectIssue = (id: string | null) => {
    setSelectedIssueId(id);
    setSelectedEventId(null);
    // On mobile, switch to timeline when selecting an issue
    setMobilePanel('timeline');
  };

  const handleSelectEvent = (id: string | null) => {
    setSelectedEventId(id);
    if (id && !selectedIssueId) {
      const event = events.find(e => e.id === id);
      if (event && event.issueIds.length > 0) {
        setSelectedIssueId(event.issueIds[0]);
      }
    }
  };

  const handleCloseDetail = () => {
    setSelectedEventId(null);
    if (!selectedEventId && selectedIssueId) {
      setSelectedIssueId(null);
    }
  };

  const showDetailPanel = selectedEvent || selectedIssue;
  const activeIssueCount = issues.filter(i => i.status === 'open' || i.status === 'investigating').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--to-text-4)', borderTopColor: 'transparent' }}
          />
          <span className="text-[12px]" style={{ color: 'var(--to-text-4)' }}>Loading events…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="to-dashboard flex flex-1 overflow-hidden">
      {/* Mobile toolbar */}
      <div
        className="to-mobile-toolbar items-center justify-between px-3 py-2 shrink-0"
        style={{
          borderBottom: '1px solid var(--to-border)',
          backgroundColor: 'var(--to-bg-panel)',
          display: 'none', /* shown via CSS on mobile */
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMobilePanel('timeline')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[12px]"
            style={{
              backgroundColor: mobilePanel === 'timeline' ? 'var(--to-bg-elevated)' : 'transparent',
              color: mobilePanel === 'timeline' ? 'var(--to-text-1)' : 'var(--to-text-4)',
              border: mobilePanel === 'timeline' ? '1px solid var(--to-border)' : '1px solid transparent',
            }}
          >
            <List size={13} />
            Timeline
          </button>
          <button
            onClick={() => setMobilePanel('issues')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[12px] relative"
            style={{
              backgroundColor: mobilePanel === 'issues' ? 'var(--to-bg-elevated)' : 'transparent',
              color: mobilePanel === 'issues' ? 'var(--to-text-1)' : 'var(--to-text-4)',
              border: mobilePanel === 'issues' ? '1px solid var(--to-border)' : '1px solid transparent',
            }}
          >
            <AlertTriangle size={13} />
            Issues
            {activeIssueCount > 0 && (
              <span
                className="text-[9px] px-1.5 rounded-full"
                style={{ backgroundColor: 'var(--to-error-subtle)', color: 'var(--to-error)' }}
              >
                {activeIssueCount}
              </span>
            )}
          </button>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--to-text-4)' }}>
          {selectedService === 'All services' ? 'All' : selectedService}
        </span>
      </div>

      <IssuesRail
        issues={issues}
        selectedIssueId={selectedIssueId}
        onSelectIssue={handleSelectIssue}
        mobileOpen={mobilePanel === 'issues'}
      />
      <Timeline
        events={filteredEvents}
        allEvents={events}
        selectedIssue={selectedIssue}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
      />
      {showDetailPanel && (
        <DetailPanel
          event={selectedEvent}
          issue={selectedIssue}
          allEvents={events}
          onClose={handleCloseDetail}
          onSelectEvent={(id) => setSelectedEventId(id)}
        />
      )}
    </div>
  );
}

