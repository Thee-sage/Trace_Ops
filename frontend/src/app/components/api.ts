import type { TimelineEvent, Issue, EventType, LogEntry } from './types';
import { getToken } from './auth-context';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://trace-ops.onrender.com';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Helpers ──

function mapEventType(backendType: string): EventType {
  switch (backendType) {
    case 'ERROR': return 'error';
    case 'DEPLOY': return 'deployment';
    case 'CONFIG_CHANGE': return 'config';
    default: return 'error';
  }
}

function extractLogEntry(meta: Record<string, unknown> | undefined, backendType: string): LogEntry | undefined {
  if (!meta) return undefined;
  const stack = meta.stack as string | undefined;
  if (!stack && backendType !== 'ERROR') return undefined;

  return {
    name: (meta.errorName as string) || (meta.name as string) || 'Error',
    stack: stack || '',
    method: (meta.method as string) || (meta.route as string)?.split(' ')[0] || 'GET',
    path: (meta.path as string) || (meta.route as string)?.split(' ').slice(1).join(' ') || '/',
    statusCode: (meta.statusCode as number) || (meta.status as number) || 500,
    userAgent: (meta.userAgent as string) || (meta.user_agent as string) || '',
    ip: (meta.ip as string) || '',
    timestamp: (meta.timestamp as string) || '',
    level: backendType === 'ERROR' ? 'error' : 'info',
    requestId: (meta.requestId as string) || undefined,
    duration: (meta.duration as string) || undefined,
  };
}

function flatMeta(meta: Record<string, unknown> | undefined): Record<string, string> {
  if (!meta) return {};
  const result: Record<string, string> = {};
  // Only surface non-internal fields as display metadata
  const skip = new Set(['stack', 'errorName', 'name', 'userAgent', 'user_agent', 'ip', 'requestId', 'timestamp']);
  for (const [k, v] of Object.entries(meta)) {
    if (skip.has(k)) continue;
    if (typeof v === 'string') result[k] = v;
    else if (typeof v === 'number') result[k] = String(v);
    else if (typeof v === 'boolean') result[k] = String(v);
  }
  return result;
}

// ── Time filter → startTime ──

function timeFilterToMs(filter: string): number | null {
  const now = Date.now();
  switch (filter) {
    case '1h': return now - 60 * 60 * 1000;
    case '6h': return now - 6 * 60 * 60 * 1000;
    case '24h': return now - 24 * 60 * 60 * 1000;
    case '7d': return now - 7 * 24 * 60 * 60 * 1000;
    case 'all': return null; // no time filter
    default: return null;
  }
}

// ── API Calls ──

export async function fetchServices(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/services`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
  const data = await res.json();
  // Backend returns array of service name strings
  if (Array.isArray(data)) return data.sort();
  // Fallback: extract from events
  if (data.events) {
    const set = new Set<string>();
    data.events.forEach((e: { serviceName?: string }) => {
      if (e.serviceName) set.add(e.serviceName);
    });
    return Array.from(set).sort();
  }
  return [];
}

export async function fetchEvents(
  serviceName?: string,
  timeFilter: string = 'all'
): Promise<TimelineEvent[]> {
  const params = new URLSearchParams();
  if (serviceName && serviceName !== 'All services') {
    params.set('serviceName', serviceName);
  }
  const startTime = timeFilterToMs(timeFilter);
  if (startTime !== null) {
    params.set('startTime', String(startTime));
  }
  params.set('limit', '500');

  const res = await fetch(`${API_BASE}/events?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  const data = await res.json();

  const rawEvents = data.events || data || [];
  return rawEvents.map((e: Record<string, unknown>): TimelineEvent => {
    const backendType = (e.eventType as string) || 'ERROR';
    const meta = (e.metadata as Record<string, unknown>) || {};
    const ts = e.timestamp as number;

    return {
      id: (e._id as string) || (e.id as string) || '',
      timestamp: new Date(ts).toISOString(),
      type: mapEventType(backendType),
      title: (e.message as string) || 'Unknown event',
      description: (e.message as string) || '',
      service: (e.serviceName as string) || '',
      environment: (meta.environment as string) || 'production',
      metadata: flatMeta(meta),
      issueIds: [],
      suggestedCause: undefined,
      logEntry: extractLogEntry(meta, backendType),
    };
  }).sort((a: TimelineEvent, b: TimelineEvent) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function fetchIssues(serviceName?: string, servicesList?: string[]): Promise<Issue[]> {
  // If "All services" is selected, fetch issues per-service and merge
  if (!serviceName || serviceName === 'All services') {
    const services = servicesList && servicesList.length > 0
      ? servicesList.filter(s => s !== 'All services')
      : await fetchServices();
    const allIssues = await Promise.all(
      services.map(s => fetchIssues(s).catch(() => [] as Issue[]))
    );
    return allIssues.flat();
  }

  const params = new URLSearchParams();
  params.set('serviceName', serviceName);

  const res = await fetch(`${API_BASE}/issues?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch issues: ${res.statusText}`);
  const rawIssues = await res.json();

  return (Array.isArray(rawIssues) ? rawIssues : []).map((i: Record<string, unknown>): Issue => {
    const suspectedCause = i.suspectedCause as Record<string, unknown> | undefined;
    const count = (i.count as number) || 0;

    return {
      id: (i._id as string) || (i.id as string) || '',
      title: (i.title as string) || 'Unknown issue',
      status: ((i.status as string) || 'open') as Issue['status'],
      impact: count,
      impactLabel: (i.impactLabel as string) || `${count} occurrence${count !== 1 ? 's' : ''}`,
      eventIds: (i.relatedEventIds as string[]) || [],
      rootCauseEventId: (i.suspectedCauseEventId as string) || undefined,
      causeSummary: suspectedCause
        ? `${(suspectedCause.type as string) || ''}: ${(suspectedCause.message as string) || ''}`
        : (i.priorityReason as string) || '',
      summary: (i.summary as string) || (i.title as string) || '',
      firstSeen: new Date((i.firstSeen as number) || Date.now()).toISOString(),
      service: (i.serviceName as string) || '',
    };
  });
}

export async function fetchNeedsAttention(serviceName: string, limit = 3): Promise<Issue[]> {
  const res = await fetch(
    `${API_BASE}/issues/needs-attention?serviceName=${encodeURIComponent(serviceName)}&limit=${limit}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  const rawIssues = await res.json();
  return (Array.isArray(rawIssues) ? rawIssues : []).map((i: Record<string, unknown>): Issue => ({
    id: (i._id as string) || (i.id as string) || '',
    title: (i.title as string) || '',
    status: ((i.status as string) || 'open') as Issue['status'],
    impact: (i.count as number) || 0,
    impactLabel: (i.impactLabel as string) || '',
    eventIds: (i.relatedEventIds as string[]) || [],
    rootCauseEventId: (i.suspectedCauseEventId as string) || undefined,
    causeSummary: (i.priorityReason as string) || '',
    summary: (i.summary as string) || '',
    firstSeen: new Date((i.firstSeen as number) || Date.now()).toISOString(),
    service: (i.serviceName as string) || '',
  }));
}
