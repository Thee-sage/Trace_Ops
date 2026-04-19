import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, ChevronLeft } from 'lucide-react';
import { IssuesRail } from './issues-rail';
import { Timeline } from './timeline';
import { DetailPanel } from './detail-panel';
import { events, issues } from './data';
import type { DeviceClass } from './use-mobile';

interface DashboardPageProps {
  timeFilter: string;
  searchQuery: string;
  selectedService: string;
  device: DeviceClass;
}

type MobileTab = 'issues' | 'timeline';

export function DashboardPage({ timeFilter, searchQuery, selectedService, device }: DashboardPageProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const isPhone = device === 'phone';
  const isTablet = device === 'tablet';
  const isCompact = isPhone || isTablet;

  const selectedIssue = useMemo(
    () => issues.find(i => i.id === selectedIssueId) ?? null,
    [selectedIssueId]
  );

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedEventId) ?? null,
    [selectedEventId]
  );

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (selectedService !== 'All services') {
      filtered = filtered.filter(e => e.service === selectedService);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          e.service.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [searchQuery, selectedService]);

  const handleSelectIssue = (id: string | null) => {
    setSelectedIssueId(id);
    setSelectedEventId(null);
    if (isPhone && id) {
      setMobileTab('timeline');
    }
  };

  const handleSelectEvent = (id: string | null) => {
    setSelectedEventId(id);
    if (id && !selectedIssueId) {
      const event = events.find(e => e.id === id);
      if (event && event.issueIds.length > 0) {
        setSelectedIssueId(event.issueIds[0]);
      }
    }
    if (isCompact && id) {
      setMobileDetailOpen(true);
    }
  };

  const handleCloseDetail = () => {
    if (isCompact) {
      setMobileDetailOpen(false);
      return;
    }
    setSelectedEventId(null);
    if (!selectedEventId && selectedIssueId) {
      setSelectedIssueId(null);
    }
  };

  const showDetailPanel = selectedEvent || selectedIssue;
  const activeIssueCount = issues.filter(i => i.status === 'open' || i.status === 'investigating').length;

  // Detail overlay used by phone & tablet
  const detailOverlay = isCompact && mobileDetailOpen && showDetailPanel && (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ backgroundColor: 'var(--to-bg-panel)' }}
    >
      <div
        className="flex items-center gap-2 px-4 h-[44px] shrink-0"
        style={{ borderBottom: '1px solid var(--to-border)' }}
      >
        <button
          onClick={handleCloseDetail}
          className="p-1 rounded-[4px]"
          style={{ color: 'var(--to-text-3)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px]" style={{ color: 'var(--to-text-2)' }}>
          {selectedEvent ? 'Event Detail' : 'Investigation'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <DetailPanel
          event={selectedEvent}
          issue={selectedIssue}
          onClose={handleCloseDetail}
          onSelectEvent={(id) => setSelectedEventId(id)}
          isMobile
        />
      </div>
    </div>
  );

  // ─── Phone layout: tab-based ───
  if (isPhone) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {detailOverlay}

        {/* Tab bar */}
        <div
          className="flex shrink-0"
          style={{ borderBottom: '1px solid var(--to-border)' }}
        >
          {([
            { id: 'issues' as MobileTab, label: 'Issues', icon: AlertTriangle, badge: activeIssueCount },
            { id: 'timeline' as MobileTab, label: 'Timeline', icon: Clock, badge: filteredEvents.length },
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-colors duration-100 relative"
                style={{
                  color: isActive ? 'var(--to-text-1)' : 'var(--to-text-4)',
                }}
              >
                <Icon size={13} />
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-[1px] rounded-full tabular-nums"
                    style={{
                      backgroundColor: isActive ? 'var(--to-bg-active)' : 'var(--to-bg-elevated)',
                      color: isActive ? 'var(--to-text-2)' : 'var(--to-text-4)',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                    style={{ backgroundColor: 'var(--to-text-1)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden">
          {mobileTab === 'issues' && (
            <IssuesRail
              issues={issues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={handleSelectIssue}
              isMobile
            />
          )}
          {mobileTab === 'timeline' && (
            <Timeline
              events={filteredEvents}
              selectedIssue={selectedIssue}
              selectedEventId={selectedEventId}
              onSelectEvent={handleSelectEvent}
              isMobile
            />
          )}
        </div>
      </div>
    );
  }

  // ─── Tablet layout: narrow issues rail + timeline, detail as overlay ───
  if (isTablet) {
    return (
      <div className="flex flex-1 overflow-hidden relative">
        {detailOverlay}
        <IssuesRail
          issues={issues}
          selectedIssueId={selectedIssueId}
          onSelectIssue={handleSelectIssue}
          isTablet
        />
        <Timeline
          events={filteredEvents}
          selectedIssue={selectedIssue}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          isMobile
        />
      </div>
    );
  }

  // ─── Desktop & Desktop-XL: full three-panel layout ───
  return (
    <div className="flex flex-1 overflow-hidden">
      <IssuesRail
        issues={issues}
        selectedIssueId={selectedIssueId}
        onSelectIssue={handleSelectIssue}
        isWide={device === 'desktop-xl'}
      />
      <Timeline
        events={filteredEvents}
        selectedIssue={selectedIssue}
        selectedEventId={selectedEventId}
        onSelectEvent={handleSelectEvent}
      />
      {showDetailPanel && (
        <DetailPanel
          event={selectedEvent}
          issue={selectedIssue}
          onClose={handleCloseDetail}
          onSelectEvent={(id) => setSelectedEventId(id)}
          isWide={device === 'desktop-xl'}
        />
      )}
    </div>
  );
}
