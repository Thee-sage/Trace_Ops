import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';
import { correlationService } from '../services/correlation';
import { issueStore } from '../services/issueStore';
import { generateFingerprint } from '../utils/fingerprint';
import { CreateEventDto, EventType, TimelineEvent, Event } from '../models/Event';

const router = Router();

async function findSuspectedCause(event: Event): Promise<string | undefined> {
  const allEvents = await storage.findAll({ serviceName: event.serviceName });
  const sortedEvents = [...allEvents].sort((a, b) => a.timestamp - b.timestamp);
  
  const currentIndex = sortedEvents.findIndex(e => e.id === event.id);
  if (currentIndex === -1) return undefined;
  
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevEvent = sortedEvents[i];
    if (prevEvent.eventType === EventType.CONFIG_CHANGE || prevEvent.eventType === EventType.DEPLOY) {
      return prevEvent.id;
    }
  }
  
  return undefined;
}

async function checkIssueResolution(triggerEvent: Event): Promise<void> {
  if (triggerEvent.eventType !== EventType.DEPLOY && triggerEvent.eventType !== EventType.CONFIG_CHANGE) {
    return;
  }

  try {
    const openIssues = await issueStore.getOpenIssues(triggerEvent.serviceName);

    const errorEventsAfter = await storage.findAll({
      serviceName: triggerEvent.serviceName,
      eventType: EventType.ERROR,
      startTime: triggerEvent.timestamp + 1,
    });

    for (const issue of openIssues) {
      let hasMatchingError = false;

      for (const errorEvent of errorEventsAfter) {
        try {
          const errorFingerprint = generateFingerprint(errorEvent);
          if (errorFingerprint === issue.fingerprint) {
            hasMatchingError = true;
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (!hasMatchingError) {
        await issueStore.resolveIssue(issue.id, triggerEvent.id, triggerEvent.timestamp);
      }
    }
  } catch (error) {
    console.error('Failed to check issue resolution:', error);
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { serviceName, eventType, startTime, endTime } = req.query;

    const options = {
      serviceName: serviceName as string | undefined,
      eventType: eventType as EventType | undefined,
      startTime: startTime ? parseInt(startTime as string, 10) : undefined,
      endTime: endTime ? parseInt(endTime as string, 10) : undefined,
    };

    const events = await storage.findAll(options);

    return res.json({
      events,
      count: events.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/timeline/:serviceName', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;

    const events = await storage.findAll({ serviceName });
    const timelineEvents: TimelineEvent[] = correlationService.analyzeEvents(events);
    timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

    return res.json({
      serviceName,
      events: timelineEvents,
      count: timelineEvents.length,
      correlationWindowMinutes: correlationService.getCorrelationWindowMs() / (60 * 1000),
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await storage.findById(id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
      });
    }

    return res.json(event);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateEventDto = req.body;

    if (!dto.eventType || !dto.serviceName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['eventType', 'serviceName'],
        received: Object.keys(dto),
      });
    }

    if (!Object.values(EventType).includes(dto.eventType)) {
      return res.status(400).json({
        error: 'Invalid event type',
        received: dto.eventType,
        validTypes: Object.values(EventType),
      });
    }

    const event = await storage.create(dto);

    if (event.eventType === EventType.ERROR) {
      try {
        const fingerprint = generateFingerprint(event);
        const suspectedCauseEventId = await findSuspectedCause(event);
        
        const existingIssue = await issueStore.findByFingerprint(event.serviceName, fingerprint);
        
        if (existingIssue) {
          const oldCount = existingIssue.count;
          const updatedIssue = await issueStore.incrementIssue(existingIssue.id, event.id, event.timestamp, suspectedCauseEventId);
          console.log(`[Issue] ✅ UPDATED existing issue "${updatedIssue.title}"`);
          console.log(`       Issue ID: ${updatedIssue.id}`);
          console.log(`       Count: ${oldCount} → ${updatedIssue.count} (incremented by 1)`);
          console.log(`       Related events: ${updatedIssue.relatedEventIds.length}`);
        } else {
          const newIssue = await issueStore.createIssue(event, fingerprint, suspectedCauseEventId);
          console.log(`[Issue] 🆕 CREATED new issue "${newIssue.title}"`);
          console.log(`       Issue ID: ${newIssue.id}`);
          console.log(`       Count: ${newIssue.count}`);
          console.log(`       Fingerprint: ${fingerprint.substring(0, 16)}...`);
        }
      } catch (error) {
        console.error('Failed to create/update issue:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack);
        }
      }
    }

    if (event.eventType === EventType.DEPLOY || event.eventType === EventType.CONFIG_CHANGE) {
      await checkIssueResolution(event);
    }

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const dtos: CreateEventDto[] = req.body.events || [];

    if (!Array.isArray(dtos) || dtos.length === 0) {
      return res.status(400).json({
        error: 'Expected array of events in body.events',
      });
    }

    for (const dto of dtos) {
      if (!dto.eventType || !dto.serviceName) {
        return res.status(400).json({
          error: 'All events must have eventType and serviceName fields',
        });
      }

      if (!Object.values(EventType).includes(dto.eventType)) {
        return res.status(400).json({
          error: `Invalid event type: ${dto.eventType}`,
          validTypes: Object.values(EventType),
        });
      }
    }

    const events = await storage.createMany(dtos);

    for (const event of events) {
      if (event.eventType === EventType.ERROR) {
        try {
          const fingerprint = generateFingerprint(event);
          const suspectedCauseEventId = await findSuspectedCause(event);
          
          const existingIssue = await issueStore.findByFingerprint(event.serviceName, fingerprint);
          
          if (existingIssue) {
            await issueStore.incrementIssue(existingIssue.id, event.id, event.timestamp, suspectedCauseEventId);
          } else {
            await issueStore.createIssue(event, fingerprint, suspectedCauseEventId);
          }
        } catch (error) {
          console.error('Failed to create/update issue:', error);
        }
      }
    }

    for (const event of events) {
      if (event.eventType === EventType.DEPLOY || event.eventType === EventType.CONFIG_CHANGE) {
        await checkIssueResolution(event);
      }
    }

    return res.status(201).json({
      events,
      count: events.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to create events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await storage.delete(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Event not found',
      });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to delete event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
