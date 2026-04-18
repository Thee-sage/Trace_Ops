// Types that map backend API responses → UI component shapes

export type EventType = 'error' | 'deployment' | 'config';
export type IssueStatus = 'open' | 'resolved' | 'investigating';

export interface LogEntry {
  name: string;
  stack: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent: string;
  ip: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  requestId?: string;
  duration?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  description: string;
  service: string;
  environment: string;
  metadata: Record<string, string>;
  issueIds: string[];
  suggestedCause?: string;
  logEntry?: LogEntry;
}

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  impact: number;
  impactLabel: string;
  eventIds: string[];
  rootCauseEventId?: string;
  causeSummary: string;
  summary: string;
  firstSeen: string;
  service: string;
}
