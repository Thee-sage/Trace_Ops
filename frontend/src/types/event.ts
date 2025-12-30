// Frontend types matching backend Event model
export enum EventType {
  DEPLOY = 'DEPLOY',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  ERROR = 'ERROR',
}

export interface Event {
  id: string;
  timestamp: number; // Unix timestamp in milliseconds
  eventType: EventType;
  serviceName: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineEvent extends Event {
  isLikelyCause?: boolean;
  correlatedTo?: string;
}

export interface TimelineResponse {
  serviceName: string;
  events: TimelineEvent[];
  count: number;
  correlationWindowMinutes: number;
}

export interface Issue {
  id: string;
  title: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedEventIds: string[];
  status: 'open' | 'resolved';
  resolvedAt?: number;
  regressionCount: number;
  uniqueRoutes: number;
  uniqueUsers?: number;
  errorRate: number;
  priorityScore: number;
  priorityReason?: string;
  suspectedCause?: {
    type: EventType;
    message: string;
    timestamp: number;
    eventId: string;
  };
  resolvedBy?: {
    type: EventType;
    message: string;
    timestamp: number;
    eventId: string;
  };
}

