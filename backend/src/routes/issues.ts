import { Router, Request, Response } from 'express';
import { issueStore } from '../services/issueStore';
import { storage } from '../services/storage';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { serviceName } = req.query;

    if (!serviceName || typeof serviceName !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: serviceName',
      });
    }

    const issues = issueStore.listIssues(serviceName);

    const enrichedIssues = issues.map(issue => {
      const result: any = {
        id: issue.id,
        title: issue.title,
        count: issue.count,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        severity: issue.severity,
        relatedEventIds: issue.relatedEventIds,
        status: issue.status,
        regressionCount: issue.regressionCount,
        uniqueRoutes: issue.uniqueRoutes,
        uniqueUsers: issue.uniqueUsers,
        errorRate: issue.errorRate,
        priorityScore: issue.priorityScore,
        priorityReason: issue.priorityReason,
      };

      if (issue.resolvedAt) {
        result.resolvedAt = issue.resolvedAt;
      }
      if (issue.resolvedByEventId) {
        const resolvedByEvent = storage.findById(issue.resolvedByEventId);
        if (resolvedByEvent) {
          result.resolvedBy = {
            type: resolvedByEvent.eventType,
            message: resolvedByEvent.message,
            timestamp: resolvedByEvent.timestamp,
            eventId: resolvedByEvent.id,
          };
        }
      }

      if (issue.suspectedCauseEventId) {
        const causeEvent = storage.findById(issue.suspectedCauseEventId);
        if (causeEvent) {
          result.suspectedCause = {
            type: causeEvent.eventType,
            message: causeEvent.message,
            timestamp: causeEvent.timestamp,
            eventId: causeEvent.id,
          };
        }
      }

      return result;
    });

    return res.json(enrichedIssues);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch issues',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/needs-attention', (req: Request, res: Response) => {
  try {
    const { serviceName, limit } = req.query;

    if (!serviceName || typeof serviceName !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: serviceName',
      });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 3;
    const topIssues = issueStore.getTopIssuesByPriority(serviceName, limitNum);

    const enrichedIssues = topIssues.map(issue => {
      const result: any = {
        id: issue.id,
        title: issue.title,
        count: issue.count,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        severity: issue.severity,
        status: issue.status,
        regressionCount: issue.regressionCount,
        uniqueRoutes: issue.uniqueRoutes,
        errorRate: issue.errorRate,
        priorityScore: issue.priorityScore,
        priorityReason: issue.priorityReason,
      };

      if (issue.suspectedCauseEventId) {
        const causeEvent = storage.findById(issue.suspectedCauseEventId);
        if (causeEvent) {
          result.suspectedCause = {
            type: causeEvent.eventType,
            message: causeEvent.message,
            timestamp: causeEvent.timestamp,
            eventId: causeEvent.id,
          };
        }
      }

      return result;
    });

    return res.json(enrichedIssues);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch issues needing attention',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

