import { Event, CreateEventDto, EventType } from '../models/Event';

class InMemoryStorage {
  private events: Map<string, Event> = new Map();
  private eventIds: string[] = []; // Maintain insertion order

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  create(dto: CreateEventDto): Event {
    const event: Event = {
      id: this.generateId(),
      timestamp: dto.timestamp || Date.now(),
      eventType: dto.eventType,
      serviceName: dto.serviceName,
      message: dto.message || '',
      metadata: dto.metadata,
    };

    this.events.set(event.id, event);
    this.eventIds.push(event.id);

    return event;
  }

  createMany(dtos: CreateEventDto[]): Event[] {
    return dtos.map((dto) => this.create(dto));
  }

  findById(id: string): Event | undefined {
    return this.events.get(id);
  }

  findAll(options?: {
    serviceName?: string;
    eventType?: EventType;
    startTime?: number;
    endTime?: number;
  }): Event[] {
    let results = Array.from(this.events.values());

    if (options?.serviceName) {
      results = results.filter((e) => e.serviceName === options.serviceName);
    }

    if (options?.eventType) {
      results = results.filter((e) => e.eventType === options.eventType);
    }

    if (options?.startTime !== undefined) {
      results = results.filter((e) => e.timestamp >= options.startTime!);
    }

    if (options?.endTime !== undefined) {
      results = results.filter((e) => e.timestamp <= options.endTime!);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  delete(id: string): boolean {
    const deleted = this.events.delete(id);
    if (deleted) {
      const index = this.eventIds.indexOf(id);
      if (index > -1) {
        this.eventIds.splice(index, 1);
      }
    }
    return deleted;
  }

  clear(): void {
    this.events.clear();
    this.eventIds = [];
  }

  count(): number {
    return this.events.size;
  }
}

export const storage = new InMemoryStorage();

