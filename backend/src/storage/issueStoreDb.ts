import { db } from './db';
import { Issue } from '../models/Issue';

class IssueStoreDb {
  findById(id: string): Issue | undefined {
    const stmt = db.prepare('SELECT * FROM issues WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return undefined;
    }

    return this.rowToIssue(row);
  }

  findByFingerprint(serviceName: string, fingerprint: string): Issue | undefined {
    const stmt = db.prepare('SELECT * FROM issues WHERE fingerprint = ? AND serviceName = ?');
    const row = stmt.get(fingerprint, serviceName) as any;

    if (!row) {
      return undefined;
    }

    return this.rowToIssue(row);
  }

  insert(issue: Issue): void {
    const stmt = db.prepare(`
      INSERT INTO issues (
        serviceName, fingerprint, id, status, count, severity, regressionCount,
        priorityScore, firstSeen, lastSeen, resolvedAt, suspectedCauseEventId,
        resolvedByEventId, title, uniqueRoutes, uniqueUsers, errorRate, priorityReason, relatedEventIds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      issue.serviceName,
      issue.fingerprint,
      issue.id,
      issue.status,
      issue.count,
      issue.severity,
      issue.regressionCount,
      issue.priorityScore,
      issue.firstSeen,
      issue.lastSeen,
      issue.resolvedAt || null,
      issue.suspectedCauseEventId || null,
      issue.resolvedByEventId || null,
      issue.title,
      issue.uniqueRoutes,
      issue.uniqueUsers || null,
      issue.errorRate,
      issue.priorityReason || null,
      JSON.stringify(issue.relatedEventIds)
    );
  }

  update(issue: Issue): void {
    const stmt = db.prepare(`
      UPDATE issues SET
        id = ?, status = ?, count = ?, severity = ?,
        regressionCount = ?, priorityScore = ?, firstSeen = ?, lastSeen = ?,
        resolvedAt = ?, suspectedCauseEventId = ?, resolvedByEventId = ?,
        title = ?, uniqueRoutes = ?, uniqueUsers = ?, errorRate = ?,
        priorityReason = ?, relatedEventIds = ?
      WHERE serviceName = ? AND fingerprint = ?
    `);

    stmt.run(
      issue.id,
      issue.status,
      issue.count,
      issue.severity,
      issue.regressionCount,
      issue.priorityScore,
      issue.firstSeen,
      issue.lastSeen,
      issue.resolvedAt || null,
      issue.suspectedCauseEventId || null,
      issue.resolvedByEventId || null,
      issue.title,
      issue.uniqueRoutes,
      issue.uniqueUsers || null,
      issue.errorRate,
      issue.priorityReason || null,
      JSON.stringify(issue.relatedEventIds),
      issue.serviceName,
      issue.fingerprint
    );
  }

  upsert(issue: Issue): void {
    // SQLite doesn't support INSERT OR REPLACE with all columns easily, so we check and update/insert
    const existing = this.findByFingerprint(issue.serviceName, issue.fingerprint);
    if (existing) {
      this.update(issue);
    } else {
      this.insert(issue);
    }
  }

  listIssues(serviceName: string): Issue[] {
    const stmt = db.prepare('SELECT * FROM issues WHERE serviceName = ? ORDER BY lastSeen DESC');
    const rows = stmt.all(serviceName) as any[];

    return rows.map((row) => this.rowToIssue(row));
  }

  getOpenIssues(serviceName: string): Issue[] {
    const stmt = db.prepare('SELECT * FROM issues WHERE serviceName = ? AND status = ?');
    const rows = stmt.all(serviceName, 'open') as any[];

    return rows.map((row) => this.rowToIssue(row));
  }

  getTopIssuesByPriority(serviceName: string, limit: number = 3): Issue[] {
    const stmt = db.prepare(`
      SELECT * FROM issues
      WHERE serviceName = ? AND status = ?
      ORDER BY priorityScore DESC
      LIMIT ?
    `);
    const rows = stmt.all(serviceName, 'open', limit) as any[];

    return rows.map((row) => this.rowToIssue(row));
  }

  clear(): void {
    db.exec('DELETE FROM issues');
  }

  private rowToIssue(row: any): Issue {
    return {
      id: row.id,
      serviceName: row.serviceName,
      fingerprint: row.fingerprint,
      title: row.title,
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      count: row.count,
      severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
      relatedEventIds: JSON.parse(row.relatedEventIds),
      suspectedCauseEventId: row.suspectedCauseEventId || undefined,
      status: row.status as 'open' | 'resolved',
      resolvedAt: row.resolvedAt || undefined,
      resolvedByEventId: row.resolvedByEventId || undefined,
      regressionCount: row.regressionCount,
      uniqueRoutes: row.uniqueRoutes,
      uniqueUsers: row.uniqueUsers || undefined,
      errorRate: row.errorRate,
      priorityScore: row.priorityScore,
      priorityReason: row.priorityReason || undefined,
    };
  }
}

export const issueStoreDb = new IssueStoreDb();

