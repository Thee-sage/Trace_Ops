export interface Issue {
  id: string;
  serviceName: string;
  fingerprint: string;
  title: string;
  firstSeen: number;
  lastSeen: number;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedEventIds: string[];
  suspectedCauseEventId?: string;
  status: 'open' | 'resolved';
  resolvedAt?: number;
  resolvedByEventId?: string;
  regressionCount: number;
  uniqueRoutes: number;
  uniqueUsers?: number;
  errorRate: number;
  priorityScore: number;
  priorityReason?: string;
}

