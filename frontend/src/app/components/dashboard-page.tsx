import { useState, useMemo, useEffect } from 'react';
import { IssuesRail } from './issues-rail';
import { Timeline } from './timeline';
import { DetailPanel } from './detail-panel';
import { fetchEvents, fetchIssues } from './api';
import type { TimelineEvent, Issue } from './types';

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
    <div className="flex flex-1 overflow-hidden">
      <IssuesRail
        issues={issues}
        selectedIssueId={selectedIssueId}
        onSelectIssue={handleSelectIssue}
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
