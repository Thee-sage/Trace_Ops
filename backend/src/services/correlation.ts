import { Event, EventType, TimelineEvent } from '../models/Event';

class CorrelationService {
  private readonly CORRELATION_WINDOW_MS = 5 * 60 * 1000;

  analyzeEvents(events: Event[]): TimelineEvent[] {
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    
    const timelineEvents: TimelineEvent[] = sortedEvents.map(event => ({
      ...event,
      isLikelyCause: false,
      correlatedTo: undefined,
    }));

    const triggerEventsByService = new Map<string, Array<{ event: Event; index: number }>>();

    sortedEvents.forEach((event, index) => {
      if (event.eventType === EventType.DEPLOY || event.eventType === EventType.CONFIG_CHANGE) {
        if (!triggerEventsByService.has(event.serviceName)) {
          triggerEventsByService.set(event.serviceName, []);
        }
        triggerEventsByService.get(event.serviceName)!.push({ event, index });
      }
    });

    sortedEvents.forEach((errorEvent, errorIndex) => {
      if (errorEvent.eventType !== EventType.ERROR) {
        return;
      }

      const triggerEvents = triggerEventsByService.get(errorEvent.serviceName) || [];

      for (let i = triggerEvents.length - 1; i >= 0; i--) {
        const { event: triggerEvent, index: triggerIndex } = triggerEvents[i];
        
        if (triggerIndex >= errorIndex) {
          continue;
        }

        const timeDiff = errorEvent.timestamp - triggerEvent.timestamp;

        if (timeDiff >= 0 && timeDiff <= this.CORRELATION_WINDOW_MS) {
          timelineEvents[errorIndex].isLikelyCause = true;
          timelineEvents[errorIndex].correlatedTo = triggerEvent.id;
          break;
        }
      }
    });

    return timelineEvents;
  }

  getCorrelationWindowMs(): number {
    return this.CORRELATION_WINDOW_MS;
  }
}

export const correlationService = new CorrelationService();

