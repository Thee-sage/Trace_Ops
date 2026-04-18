import { Event, CreateEventDto, EventType } from '../models/Event';
import { EventModel } from '../models/EventSchema';

class EventStore {
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(dto: CreateEventDto): Promise<Event> {
    const event: Event = {
      id: this.generateId(),
      timestamp: dto.timestamp || Date.now(),
      eventType: dto.eventType,
      serviceName: dto.serviceName,
      message: dto.message || '',
      metadata: dto.metadata,
      userId: dto.userId,
    };

    const eventDoc = new EventModel({
      _id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      serviceName: event.serviceName,
      message: event.message,
      metadata: event.metadata,
      userId: event.userId,
    });

    await eventDoc.save();

    return event;
  }

  async createMany(dtos: CreateEventDto[]): Promise<Event[]> {
    const events: Event[] = [];

    for (const dto of dtos) {
      const event: Event = {
        id: this.generateId(),
        timestamp: dto.timestamp || Date.now(),
        eventType: dto.eventType,
        serviceName: dto.serviceName,
        message: dto.message || '',
        metadata: dto.metadata,
        userId: dto.userId,
      };

      events.push(event);
    }

    const eventDocs = events.map((event) => ({
      _id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      serviceName: event.serviceName,
      message: event.message,
      metadata: event.metadata,
      userId: event.userId,
    }));

    await EventModel.insertMany(eventDocs);

    return events;
  }

  async findById(id: string): Promise<Event | undefined> {
    const doc = await EventModel.findById(id).lean().exec();
    
    if (!doc) {
      return undefined;
    }

    return {
      id: doc._id.toString(),
      timestamp: doc.timestamp,
      eventType: doc.eventType as EventType,
      serviceName: doc.serviceName,
      message: doc.message,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    };
  }

  async findAll(options?: {
    serviceName?: string;
    eventType?: EventType;
    startTime?: number;
    endTime?: number;
    userId?: string;
  }): Promise<Event[]> {
    const query: any = {};

    if (options?.userId) {
      query.userId = options.userId;
    }

    if (options?.serviceName) {
      query.serviceName = options.serviceName;
    }

    if (options?.eventType) {
      query.eventType = options.eventType;
    }

    if (options?.startTime !== undefined || options?.endTime !== undefined) {
      query.timestamp = {};
      if (options.startTime !== undefined) {
        query.timestamp.$gte = options.startTime;
      }
      if (options.endTime !== undefined) {
        query.timestamp.$lte = options.endTime;
      }
    }

    const docs = await EventModel.find(query)
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      timestamp: doc.timestamp,
      eventType: doc.eventType as EventType,
      serviceName: doc.serviceName,
      message: doc.message,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const result = await EventModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async clear(): Promise<void> {
    await EventModel.deleteMany({}).exec();
  }

  async count(): Promise<number> {
    return await EventModel.countDocuments({}).exec();
  }

  async listServices(userId?: string): Promise<string[]> {
    const filter: any = userId ? { userId } : {};
    const serviceNames = await EventModel.distinct('serviceName', filter).exec();
    return serviceNames.sort();
  }
}

export const eventStore = new EventStore();

