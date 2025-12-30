import { useEffect, useState } from 'react';
import logo from '../assets/logo.jpeg';

const API_BASE = 'https://trace-ops.onrender.com';

interface ServiceCard {
  name: string;
  eventCount: number;
  lastActivity: number | null;
}

interface ServiceOverviewProps {
  services: string[];
  onSelectService: (serviceName: string) => void;
  loading?: boolean;
}

export function ServiceOverview({ services, onSelectService, loading }: ServiceOverviewProps) {
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    const loadServiceData = async () => {
      if (services.length === 0) {
        setLoadingCards(false);
        return;
      }

      setLoadingCards(true);
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
              
              // Find latest timestamp
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
        console.error('Failed to load service data:', error);
      } finally {
        setLoadingCards(false);
      }
    };

    loadServiceData();
  }, [services]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
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

  if (loading || loadingCards) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-gray-400">Loading services...</div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-8 py-16">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={logo} 
              alt="TraceOps Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-4xl font-semibold text-gray-100">
              TraceOps
            </h1>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl">
            An incident prioritization engine that automatically explains
            what broke, when it broke, and what needs attention.
          </p>
        </header>

          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="max-w-md">
              <h2 className="text-xl font-medium text-gray-300 mb-3">
                No services detected yet
              </h2>
              <p className="text-gray-500 mb-2">
                TraceOps automatically discovers services as events arrive.
              </p>
              <p className="text-sm text-gray-600">
                Send a DEPLOY or ERROR event to begin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-8 py-16">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={logo} 
              alt="TraceOps Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-4xl font-semibold text-gray-100">
              TraceOps
            </h1>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl mb-2">
            An incident prioritization engine that automatically explains
            what broke, when it broke, and what needs attention.
          </p>
          <p className="text-sm text-gray-500">
            Select a service to inspect its operational timeline.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCards.map((card) => (
            <button
              key={card.name}
              onClick={() => onSelectService(card.name)}
              className="text-left p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-200 group-hover:text-gray-100">
                  {card.name}
                </h3>
                {card.lastActivity !== null && (
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
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
                  <span className="text-sm text-gray-500">Events</span>
                  <span className="text-sm font-medium text-gray-300">
                    {card.eventCount.toLocaleString()}
                  </span>
                </div>

                {card.lastActivity !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Last activity</span>
                    <span className="text-sm text-gray-400">
                      {formatTimestamp(card.lastActivity)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

