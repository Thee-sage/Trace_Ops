export enum EventType {
  DEPLOY = 'DEPLOY',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  ERROR = 'ERROR',
}

export interface Event {
  id: string;
  timestamp: number;
  eventType: EventType;
  serviceName: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface CreateEventDto {
  eventType: EventType;
  serviceName: string;
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
}

export interface TimelineEvent extends Event {
  isLikelyCause?: boolean;
  correlatedTo?: string;
}
