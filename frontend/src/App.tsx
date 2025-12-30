import { useState, useEffect } from 'react';
import { ServiceSelector } from './components/ServiceSelector';
import { TimelineView } from './components/TimelineView';
import { IssuesView } from './components/IssuesView';
import { NeedsAttentionView } from './components/NeedsAttentionView';
import { fetchTimeline, fetchServices, fetchIssues, fetchNeedsAttention } from './api/client';
import { TimelineEvent, Issue } from './types/event';

function App() {
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needsAttention, setNeedsAttention] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      loadTimeline(selectedService, true);
      loadIssues(selectedService);
      loadNeedsAttention(selectedService);
    } else {
      setTimelineEvents([]);
      setIssues([]);
      setNeedsAttention([]);
      setHighlightedEventIds(new Set());
    }
  }, [selectedService]);

  useEffect(() => {
    if (!selectedService) return;

    const pollInterval = setInterval(() => {
      loadTimeline(selectedService);
      loadIssues(selectedService);
      loadNeedsAttention(selectedService);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [selectedService]);

  async function loadServices() {
    try {
      const serviceList = await fetchServices();
      setServices(serviceList);
    } catch (err) {
      console.error('Failed to load services:', err);
      setError(err instanceof Error ? err.message : 'Failed to load services');
    }
  }

  async function loadTimeline(serviceName: string, isInitialLoad = false) {
    if (isInitialLoad) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const timeline = await fetchTimeline(serviceName);
      setTimelineEvents(timeline.events);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      if (isInitialLoad) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        setTimelineEvents([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }

  async function loadIssues(serviceName: string) {
    try {
      const issuesData = await fetchIssues(serviceName);
      setIssues(issuesData);
    } catch (err) {
      console.error('Failed to load issues:', err);
    }
  }

  async function loadNeedsAttention(serviceName: string) {
    try {
      const attentionData = await fetchNeedsAttention(serviceName, 3);
      setNeedsAttention(attentionData);
    } catch (err) {
      console.error('Failed to load needs attention:', err);
    }
  }

  function handleIssueClick(issue: Issue) {
    const eventIds = new Set<string>(issue.relatedEventIds);
    if (issue.suspectedCause) {
      eventIds.add(issue.suspectedCause.eventId);
    }
    setHighlightedEventIds(eventIds);

    let targetEventId: string | null = null;
    if (issue.suspectedCause) {
      targetEventId = issue.suspectedCause.eventId;
    } else if (issue.relatedEventIds.length > 0) {
      targetEventId = issue.relatedEventIds[0];
    }

    if (targetEventId) {
      setTimeout(() => {
        const eventElement = document.getElementById(`event-${targetEventId}`);
        if (eventElement) {
          eventElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    }

    setTimeout(() => {
      setHighlightedEventIds(new Set());
    }, 4000);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <header className="mb-16">
          <h1 className="text-3xl font-semibold text-gray-200 mb-2">
            TraceOps
          </h1>
          <p className="text-gray-400">
            Incident Timeline & Root-Cause Engine
          </p>
        </header>

        {error && (
          <div className="mb-16 p-5 bg-slate-950 border border-red-600 rounded-lg text-red-600">
            Error: {error}
          </div>
        )}

        {selectedService ? (
          <>
            <div className="grid grid-cols-10 gap-8 mb-20">
              <div className="col-span-7 space-y-20">
                <NeedsAttentionView
                  issues={needsAttention}
                  loading={loading}
                  onIssueClick={handleIssueClick}
                />

                <div>
                  <h2 className="text-xl font-semibold text-gray-200 mb-3">
                    Issues: {selectedService}
                  </h2>
                  <p className="text-sm text-gray-500 mb-8">
                    {issues.length} issue{issues.length !== 1 ? 's' : ''} found
                  </p>
                  <IssuesView 
                    issues={issues} 
                    loading={loading}
                    onIssueClick={handleIssueClick}
                    highlightedEventIds={highlightedEventIds}
                  />
                </div>
              </div>

              <div className="col-span-3">
                <div className="space-y-8">
                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">
                      Controls
                    </h3>
                    <ServiceSelector
                      services={services}
                      selectedService={selectedService}
                      onSelect={setSelectedService}
                      loading={loading}
                    />
                  </div>

                  <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">
                      Overview
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total Issues</div>
                        <div className="text-2xl font-semibold text-gray-200">{issues.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Needs Attention</div>
                        <div className="text-2xl font-semibold text-gray-200">{needsAttention.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Timeline Events</div>
                        <div className="text-2xl font-semibold text-gray-200">{timelineEvents.length}</div>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="text-xl font-semibold text-gray-200 mb-3">
                Timeline: {selectedService}
              </h2>
              <p className="text-sm text-gray-500 mb-8">
                {timelineEvents.length} event{timelineEvents.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">
                Select Service
              </h3>
              <ServiceSelector
                services={services}
                selectedService={selectedService}
                onSelect={setSelectedService}
                loading={loading}
              />
            </div>
          </div>
        )}

        {selectedService && (
          <TimelineView 
            events={timelineEvents} 
            loading={loading}
            highlightedEventIds={highlightedEventIds}
          />
        )}
      </div>
    </div>
  );
}

export default App;

