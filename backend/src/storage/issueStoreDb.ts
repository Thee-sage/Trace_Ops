import { Issue } from '../models/Issue';
import { IssueModel } from '../models/IssueSchema';

class IssueStoreDb {
  async findById(id: string): Promise<Issue | undefined> {
    const doc = await IssueModel.findById(id).lean().exec();
    
    if (!doc) {
      return undefined;
    }

    return this.docToIssue(doc);
  }

  async findByFingerprint(serviceName: string, fingerprint: string): Promise<Issue | undefined> {
    const doc = await IssueModel.findOne({ serviceName, fingerprint }).lean().exec();
    
    if (!doc) {
      return undefined;
    }

    return this.docToIssue(doc);
  }

  async insert(issue: Issue): Promise<void> {
    const issueDoc = new IssueModel({
      _id: issue.id,
      serviceName: issue.serviceName,
      fingerprint: issue.fingerprint,
      title: issue.title,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      count: issue.count,
      severity: issue.severity,
      relatedEventIds: issue.relatedEventIds,
      suspectedCauseEventId: issue.suspectedCauseEventId,
      status: issue.status,
      resolvedAt: issue.resolvedAt,
      resolvedByEventId: issue.resolvedByEventId,
      regressionCount: issue.regressionCount,
      uniqueRoutes: issue.uniqueRoutes,
      uniqueUsers: issue.uniqueUsers,
      errorRate: issue.errorRate,
      priorityScore: issue.priorityScore,
      priorityReason: issue.priorityReason,
    });

    await issueDoc.save();
  }

  async update(issue: Issue): Promise<void> {
    await IssueModel.findOneAndUpdate(
      { serviceName: issue.serviceName, fingerprint: issue.fingerprint },
      {
        _id: issue.id,
        title: issue.title,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        count: issue.count,
        severity: issue.severity,
        relatedEventIds: issue.relatedEventIds,
        suspectedCauseEventId: issue.suspectedCauseEventId,
        status: issue.status,
        resolvedAt: issue.resolvedAt,
        resolvedByEventId: issue.resolvedByEventId,
        regressionCount: issue.regressionCount,
        uniqueRoutes: issue.uniqueRoutes,
        uniqueUsers: issue.uniqueUsers,
        errorRate: issue.errorRate,
        priorityScore: issue.priorityScore,
        priorityReason: issue.priorityReason,
      },
      { upsert: false }
    ).exec();
  }

  async upsert(issue: Issue): Promise<void> {
    await IssueModel.findOneAndUpdate(
      { serviceName: issue.serviceName, fingerprint: issue.fingerprint },
      {
        _id: issue.id,
        title: issue.title,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        count: issue.count,
        severity: issue.severity,
        relatedEventIds: issue.relatedEventIds,
        suspectedCauseEventId: issue.suspectedCauseEventId,
        status: issue.status,
        resolvedAt: issue.resolvedAt,
        resolvedByEventId: issue.resolvedByEventId,
        regressionCount: issue.regressionCount,
        uniqueRoutes: issue.uniqueRoutes,
        uniqueUsers: issue.uniqueUsers,
        errorRate: issue.errorRate,
        priorityScore: issue.priorityScore,
        priorityReason: issue.priorityReason,
      },
      { upsert: true }
    ).exec();
  }

  async listIssues(serviceName: string): Promise<Issue[]> {
    const docs = await IssueModel.find({ serviceName })
      .sort({ lastSeen: -1 })
      .lean()
      .exec();

    return docs.map((doc) => this.docToIssue(doc));
  }

  async getOpenIssues(serviceName: string): Promise<Issue[]> {
    const docs = await IssueModel.find({ serviceName, status: 'open' })
      .lean()
      .exec();

    return docs.map((doc) => this.docToIssue(doc));
  }

  async getTopIssuesByPriority(serviceName: string, limit: number = 3): Promise<Issue[]> {
    const docs = await IssueModel.find({ serviceName, status: 'open' })
      .sort({ priorityScore: -1 })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((doc) => this.docToIssue(doc));
  }

  async clear(): Promise<void> {
    await IssueModel.deleteMany({}).exec();
  }

  private docToIssue(doc: any): Issue {
    return {
      id: doc._id.toString(),
      serviceName: doc.serviceName,
      fingerprint: doc.fingerprint,
      title: doc.title,
      firstSeen: doc.firstSeen,
      lastSeen: doc.lastSeen,
      count: doc.count,
      severity: doc.severity as 'low' | 'medium' | 'high' | 'critical',
      relatedEventIds: doc.relatedEventIds || [],
      suspectedCauseEventId: doc.suspectedCauseEventId || undefined,
      status: doc.status as 'open' | 'resolved',
      resolvedAt: doc.resolvedAt || undefined,
      resolvedByEventId: doc.resolvedByEventId || undefined,
      regressionCount: doc.regressionCount,
      uniqueRoutes: doc.uniqueRoutes,
      uniqueUsers: doc.uniqueUsers || undefined,
      errorRate: doc.errorRate,
      priorityScore: doc.priorityScore,
      priorityReason: doc.priorityReason || undefined,
    };
  }
}

export const issueStoreDb = new IssueStoreDb();

