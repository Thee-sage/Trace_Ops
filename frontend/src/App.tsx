import { useState, useEffect } from 'react';
import { ServiceSelector } from './components/ServiceSelector';
import { TimelineView } from './components/TimelineView';
import { IssuesView } from './components/IssuesView';
import { NeedsAttentionView } from './components/NeedsAttentionView';
import { fetchTimeline, fetchIssues, fetchNeedsAttention } from './api/client';
import { TimelineEvent, Issue } from './types/event';
import logo from './assets/logo.jpeg';

const API_BASE = "https://trace-ops.onrender.com";

interface ServiceCard {
  name: string;
  eventCount: number;
  lastActivity: number | null;
}

function App() {
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needsAttention, setNeedsAttention] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(new Set());
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>([]);
  const [loadingServiceCards, setLoadingServiceCards] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        console.log("[TraceOps] Fetching services from:", `${API_BASE}/services`);
        const response = await fetch(`${API_BASE}/services`);
        console.log("[TraceOps] Services response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch services: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("[TraceOps] Services response:", data);
        
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          console.error("[TraceOps] Invalid response format - expected array, got:", typeof data);
          setServices([]);
        }
      } catch (error) {
        console.error("[TraceOps] Fetch failed", error);
        setServices([]);
        setError(error instanceof Error ? error.message : 'Failed to load services');
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    const loadServiceCards = async () => {
      if (services.length === 0) {
        setServiceCards([]);
        return;
      }

      setLoadingServiceCards(true);
      try {
        const cards: ServiceCard[] = await Promise.all(
          services.map(async (serviceName) => {
            try {
              const response = await fetch(
                `${API_BASE}/events?serviceName=${encodeURIComponent(serviceName)}`
              );
              if (!response.ok) {
                return {
                  name: serviceName,
                  eventCount: 0,
                  lastActivity: null,
                };
              }

              const data = await response.json();
              const events = data.events || [];
              
              const lastActivity = events.length > 0
                ? Math.max(...events.map((e: any) => e.timestamp))
                : null;

              return {
                name: serviceName,
                eventCount: events.length,
                lastActivity,
              };
            } catch (error) {
              console.error(`Failed to fetch data for ${serviceName}:`, error);
              return {
                name: serviceName,
                eventCount: 0,
                lastActivity: null,
              };
            }
          })
        );

        setServiceCards(cards);
      } catch (error) {
        console.error('Failed to load service cards:', error);
      } finally {
        setLoadingServiceCards(false);
      }
    };

    loadServiceCards();
  }, [services]);

  useEffect(() => {
    console.log("🔁 EFFECT FIRED");
    console.log("Selected service:", selectedService);

    if (!selectedService) {
      console.warn("❌ No service selected yet");
      return;
    }

    const fetchAll = async () => {
      try {
        console.log("[TraceOps] Fetching EVENTS from:", `${API_BASE}/events?serviceName=${encodeURIComponent(selectedService)}`);
        const eventsRes = await fetch(
          `${API_BASE}/events?serviceName=${encodeURIComponent(selectedService)}`
        );
        console.log("EVENTS status:", eventsRes.status);
        const data = await eventsRes.json();
        console.log("EVENTS data:", data);
        // Backend returns { events: Event[], count: number }
        const eventsArray = Array.isArray(data?.events) ? data.events : [];
        setTimelineEvents(eventsArray);
      } catch (error) {
        console.error("[TraceOps] Fetch failed", error);
        setTimelineEvents([]);
      }

      try {
        console.log("[TraceOps] Fetching ISSUES from:", `${API_BASE}/issues?serviceName=${encodeURIComponent(selectedService)}`);
        const issuesRes = await fetch(
          `${API_BASE}/issues?serviceName=${encodeURIComponent(selectedService)}`
        );
        console.log("ISSUES status:", issuesRes.status);
        const issues = await issuesRes.json();
        console.log("ISSUES data:", issues);
        setIssues(issues);
      } catch (error) {
        console.error("[TraceOps] Fetch failed", error);
      }

      try {
        console.log("[TraceOps] Fetching NEEDS ATTENTION from:", `${API_BASE}/issues/needs-attention?serviceName=${encodeURIComponent(selectedService)}`);
        const naRes = await fetch(
          `${API_BASE}/issues/needs-attention?serviceName=${encodeURIComponent(selectedService)}`
        );
        console.log("NEEDS ATTENTION status:", naRes.status);
        const needsAttention = await naRes.json();
        console.log("NEEDS ATTENTION data:", needsAttention);
        setNeedsAttention(needsAttention);
      } catch (error) {
        console.error("[TraceOps] Fetch failed", error);
      }
    };

    fetchAll();
  }, [selectedService]);


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

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days}d ago`;
    }
  };

  const isActive = (lastActivity: number | null): boolean => {
    if (!lastActivity) return false;
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return lastActivity >= tenMinutesAgo;
  };

  // Show Service Overview when no service is selected
  if (!selectedService) {
    return (
      <>
        {error && (
          <div className="fixed top-4 right-4 z-50 p-4 bg-slate-900 border border-red-600 rounded-lg text-red-400 max-w-md">
            Error: {error}
          </div>
        )}
        <div className="min-h-screen bg-slate-950">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              
              {/* LEFT COLUMN - What TraceOps Is */}
              <div className="lg:col-span-3">
                <div className="mb-6 md:mb-8">
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-200 mb-2">
                    TraceOps
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 mb-6 md:mb-8">
                    Incident Timeline & Root-Cause Engine
                  </p>
                </div>

                <div className="space-y-6">
                  <ul className="space-y-4 text-sm text-gray-300">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-3">•</span>
                      <span>Automatically reconstructs incident timelines</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-3">•</span>
                      <span>Detects resolution & regression without human input</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-3">•</span>
                      <span>Prioritizes incidents by real impact, not noise</span>
                    </li>
                  </ul>

                  <p className="text-sm text-gray-400 pt-4 border-t border-slate-800">
                    TraceOps is not a log viewer. It is an incident prioritization engine.
                  </p>
                </div>
              </div>

              {/* CENTER COLUMN - Services */}
              <div className="lg:col-span-6">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2">
                    Monitored Services
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Select a service to inspect its operational history
                  </p>
                </div>

                {loadingServiceCards ? (
                  <div className="text-gray-400 text-sm">Loading services...</div>
                ) : serviceCards.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
                    <p className="text-gray-400 mb-2">Loading services please wait the deployment is still on test servers... </p>
                    <p className="text-sm text-gray-500">
                      TraceOps automatically discovers services as events arrive.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {serviceCards.map((card) => (
                      <button
                        key={card.name}
                        onClick={() => setSelectedService(card.name)}
                        className="text-left p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:bg-slate-900/80 active:bg-slate-900/70"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-base font-medium text-gray-200">
                            {card.name}
                          </h3>
                          {card.lastActivity !== null && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                isActive(card.lastActivity)
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}
                            >
                              {isActive(card.lastActivity) ? 'Active' : 'Idle'}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Events</span>
                            <span className="text-xs font-medium text-gray-300">
                              {card.eventCount.toLocaleString()}
                            </span>
                          </div>

                          {card.lastActivity !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Last activity</span>
                              <span className="text-xs text-gray-400">
                                {formatTimestamp(card.lastActivity)}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN - Integration Guide */}
              <div className="lg:col-span-3">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 lg:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-200 mb-4 sm:mb-6">
                    Integrate TraceOps
                  </h2>

                  <div className="space-y-6 sm:space-y-6">
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
                        Captured Events
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
                          <span>Deploys</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
                          <span>Runtime errors</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
                          <span>Configuration changes</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
                          <span>Incident lifecycle</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                        Add TraceOps to your backend in under 2 minutes:
                      </p>
                      <pre className="text-xs sm:text-sm text-gray-200 bg-slate-950 rounded-lg border border-slate-800 p-4 sm:p-5 font-mono leading-relaxed whitespace-pre-wrap break-words">
{`import TraceOps from 'traceops-sdk';

TraceOps.init({
  endpoint: 'https://trace-ops.onrender.com',
  serviceName: 'my-backend-service'
});

TraceOps.express(app);`}
                      </pre>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                        After Integration
                      </h3>
                      <ul className="space-y-2 text-xs text-gray-400">
                        <li>Automatic incident grouping</li>
                        <li>Timeline correlation</li>
                        <li>Priority scoring</li>
                        <li>No manual logging</li>
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <a
                        href="https://github.com/Thee-sage/Trace_Ops"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                            clipRule="evenodd"
                          />
                        </svg>
                        View Documentation
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show dashboard when service is selected
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 sm:p-6 md:p-8">
          <button
            onClick={() => setSelectedService(null)}
            className="mb-6 sm:mb-8 text-xs sm:text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All services
          </button>

          {error && (
            <div className="mb-8 sm:mb-16 p-4 sm:p-5 bg-slate-950 border border-red-600 rounded-lg text-sm sm:text-base text-red-600">
              Error: {error}
            </div>
          )}

          <header className="mb-8 sm:mb-12 md:mb-16">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <img 
                src={logo} 
                alt="TraceOps Logo" 
                className="h-8 sm:h-10 w-auto"
              />
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-200">
                TraceOps
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-400">
              Incident Timeline & Root-Cause Engine
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20">
          <div className="lg:col-span-7 space-y-12 sm:space-y-16 md:space-y-20">
            <NeedsAttentionView
              issues={needsAttention}
              loading={loading}
              onIssueClick={handleIssueClick}
            />

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2 sm:mb-3">
                Issues: {selectedService}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
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

          <div className="lg:col-span-3">
            <div className="space-y-6 sm:space-y-8">
              <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-3 sm:mb-4 uppercase tracking-wide">
                  Controls
                </h3>
                <ServiceSelector
                  services={services}
                  selectedService={selectedService}
                  onSelect={(value) => {
                    console.log("🔽 Service changed to:", value);
                    setSelectedService(value);
                  }}
                  loading={loading}
                />
              </div>

              <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-3 sm:mb-4 uppercase tracking-wide">
                  Overview
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Total Issues</div>
                    <div className="text-xl sm:text-2xl font-semibold text-gray-200">{issues.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Needs Attention</div>
                    <div className="text-xl sm:text-2xl font-semibold text-gray-200">{needsAttention.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Timeline Events</div>
                    <div className="text-xl sm:text-2xl font-semibold text-gray-200">{timelineEvents.length}</div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>

          <div className="mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2 sm:mb-3">
              Timeline: {selectedService}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
              {timelineEvents.length} event{timelineEvents.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <TimelineView 
            events={timelineEvents} 
            loading={loading}
            highlightedEventIds={highlightedEventIds}
          />

        </div>
      </div>
    </div>
  );
}

export default App;

