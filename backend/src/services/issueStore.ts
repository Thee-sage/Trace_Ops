import { Issue } from '../models/Issue';
import { Event, EventType } from '../models/Event';
import { storage } from './storage';
import { issueStoreDb } from '../storage/issueStoreDb';

class IssueStore {

  private generateId(): string {
    return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractRoute(event: Event): string {
    if (event.metadata?.route && typeof event.metadata.route === 'string') {
      return event.metadata.route;
    }
    
    // Try to extract from message
    if (event.message) {
      const routeMatch = event.message.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/i);
      if (routeMatch) {
        return routeMatch[1];
      }
    }
    
    return '';
  }

  private extractUserId(event: Event): string | undefined {
    if (event.metadata?.userId && typeof event.metadata.userId === 'string') {
      return event.metadata.userId;
    }
    if (event.metadata?.user_id && typeof event.metadata.user_id === 'string') {
      return event.metadata.user_id;
    }
    return undefined;
  }

  private computeImpactMetrics(issue: Issue): { uniqueRoutes: number; uniqueUsers?: number; errorRate: number } {
    const events = issue.relatedEventIds
      .map(id => storage.findById(id))
      .filter((e): e is Event => e !== undefined && e.eventType === EventType.ERROR);

    const routes = new Set<string>();
    events.forEach(event => {
      const route = this.extractRoute(event);
      if (route) routes.add(route);
    });

    const users = new Set<string>();
    events.forEach(event => {
      const userId = this.extractUserId(event);
      if (userId) users.add(userId);
    });

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp >= oneHourAgo);
    const timeSpanMinutes = Math.max(1, (now - Math.min(...recentEvents.map(e => e.timestamp), now)) / (60 * 1000));
    const errorRate = recentEvents.length / timeSpanMinutes;

    return {
      uniqueRoutes: routes.size,
      uniqueUsers: users.size > 0 ? users.size : undefined,
      errorRate: errorRate || 0,
    };
  }

  private determineSeverity(
    message: string, 
    count: number, 
    errorRate: number, 
    regressionCount: number, 
    uniqueRoutes: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase();
    let baseSeverity: 'low' | 'medium' | 'high' = 'low';
    
    if (
      lowerMessage.includes('crash') ||
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('critical') ||
      lowerMessage.includes('timeout') ||
      count > 10
    ) {
      baseSeverity = 'high';
    } else if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('exception') ||
      count > 3
    ) {
      baseSeverity = 'medium';
    }

    if (errorRate > 10) {
      return 'critical';
    }

    if (regressionCount > 0) {
      if (baseSeverity === 'low') baseSeverity = 'medium';
      else if (baseSeverity === 'medium') baseSeverity = 'high';
      else if (baseSeverity === 'high') return 'critical';
    }

    if (uniqueRoutes > 1) {
      if (baseSeverity === 'low') baseSeverity = 'medium';
      else if (baseSeverity === 'medium') baseSeverity = 'high';
      else if (baseSeverity === 'high') return 'critical';
    }

    if (errorRate > 5 && baseSeverity === 'high') {
      return 'critical';
    }

    return baseSeverity;
  }

  private calculatePriorityScore(
    severity: 'low' | 'medium' | 'high' | 'critical',
    errorRate: number,
    regressionCount: number,
    firstSeen: number,
    status: 'open' | 'resolved'
  ): { score: number; reason?: string } {
    let score = 0;
    switch (severity) {
      case 'critical': score = 80; break;
      case 'high': score = 60; break;
      case 'medium': score = 40; break;
      case 'low': score = 20; break;
    }

    const errorRateComponent = Math.min(15, errorRate * 1.5);
    score += errorRateComponent;

    score += Math.min(10, regressionCount * 5);

    const hoursSinceFirstSeen = (Date.now() - firstSeen) / (60 * 60 * 1000);
    const recencyComponent = hoursSinceFirstSeen < 1 ? 10 : Math.max(0, 10 - hoursSinceFirstSeen / 6);
    score += recencyComponent;

    if (status === 'resolved') {
      score *= 0.3;
    }

    score = Math.min(100, Math.max(0, score));

    const reasons: string[] = [];
    if (errorRate > 10) {
      reasons.push(`High error rate (${errorRate.toFixed(1)}/min)`);
    }
    if (regressionCount > 0) {
      reasons.push(`Regressed ${regressionCount} time${regressionCount > 1 ? 's' : ''}`);
    }
    if (severity === 'critical') {
      reasons.push('Critical severity');
    }
    if (hoursSinceFirstSeen < 1) {
      reasons.push('Recently introduced');
    }

    return {
      score: Math.round(score),
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  }

  findByFingerprint(serviceName: string, fingerprint: string): Issue | undefined {
    return issueStoreDb.findByFingerprint(serviceName, fingerprint);
  }

  createIssue(event: Event, fingerprint: string, suspectedCauseEventId?: string): Issue {
    if (event.eventType !== EventType.ERROR) {
      throw new Error('Issues can only be created from ERROR events');
    }

    const issue: Issue = {
      id: this.generateId(),
      serviceName: event.serviceName,
      fingerprint,
      title: event.message || 'Unknown error',
      firstSeen: event.timestamp,
      lastSeen: event.timestamp,
      count: 1,
      severity: 'low',
      relatedEventIds: [event.id],
      suspectedCauseEventId,
      status: 'open',
      regressionCount: 0,
      uniqueRoutes: 0,
      errorRate: 0,
      priorityScore: 0,
    };

    this.updateIssueMetrics(issue);

    issueStoreDb.upsert(issue);

    return issue;
  }

  incrementIssue(issueId: string, eventId: string, timestamp: number, suspectedCauseEventId?: string): Issue {
    const issue = issueStoreDb.findById(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    if (issue.status === 'resolved') {
      issue.status = 'open';
      issue.regressionCount += 1;
      issue.resolvedAt = undefined;
      issue.resolvedByEventId = undefined;
    }

    issue.count += 1;
    issue.lastSeen = Math.max(issue.lastSeen, timestamp);
    issue.relatedEventIds.push(eventId);
    
    if (suspectedCauseEventId) {
      issue.suspectedCauseEventId = suspectedCauseEventId;
    }

    this.updateIssueMetrics(issue);

    issueStoreDb.upsert(issue);

    return issue;
  }

  resolveIssue(issueId: string, resolvedByEventId: string, resolvedAt: number): Issue {
    const issue = issueStoreDb.findById(issueId);
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    issue.status = 'resolved';
    issue.resolvedAt = resolvedAt;
    issue.resolvedByEventId = resolvedByEventId;

    this.updateIssueMetrics(issue);

    issueStoreDb.upsert(issue);

    return issue;
  }

  private updateIssueMetrics(issue: Issue): void {
    const metrics = this.computeImpactMetrics(issue);
    issue.uniqueRoutes = metrics.uniqueRoutes;
    issue.uniqueUsers = metrics.uniqueUsers;
    issue.errorRate = metrics.errorRate;

    issue.severity = this.determineSeverity(
      issue.title,
      issue.count,
      issue.errorRate,
      issue.regressionCount,
      issue.uniqueRoutes
    );

    const priority = this.calculatePriorityScore(
      issue.severity,
      issue.errorRate,
      issue.regressionCount,
      issue.firstSeen,
      issue.status
    );
    issue.priorityScore = priority.score;
    issue.priorityReason = priority.reason;
  }

  getOpenIssues(serviceName: string): Issue[] {
    return issueStoreDb.getOpenIssues(serviceName);
  }

  getTopIssuesByPriority(serviceName: string, limit: number = 3): Issue[] {
    return issueStoreDb.getTopIssuesByPriority(serviceName, limit);
  }

  listIssues(serviceName: string): Issue[] {
    return issueStoreDb.listIssues(serviceName);
  }

  findById(id: string): Issue | undefined {
    return issueStoreDb.findById(id);
  }

  clear(): void {
    issueStoreDb.clear();
  }
}

export const issueStore = new IssueStore();

