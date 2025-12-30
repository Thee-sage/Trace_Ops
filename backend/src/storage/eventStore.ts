import { db } from './db';
import { Event, CreateEventDto, EventType } from '../models/Event';

class EventStore {
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

    const stmt = db.prepare(`
      INSERT INTO events (id, timestamp, eventType, serviceName, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.timestamp,
      event.eventType,
      event.serviceName,
      event.message,
      event.metadata ? JSON.stringify(event.metadata) : null
    );

    return event;
  }

  createMany(dtos: CreateEventDto[]): Event[] {
    const events: Event[] = [];
    const insert = db.prepare(`
      INSERT INTO events (id, timestamp, eventType, serviceName, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((dtos: CreateEventDto[]) => {
      for (const dto of dtos) {
        const event: Event = {
          id: this.generateId(),
          timestamp: dto.timestamp || Date.now(),
          eventType: dto.eventType,
          serviceName: dto.serviceName,
          message: dto.message || '',
          metadata: dto.metadata,
        };

        insert.run(
          event.id,
          event.timestamp,
          event.eventType,
          event.serviceName,
          event.message,
          event.metadata ? JSON.stringify(event.metadata) : null
        );

        events.push(event);
      }
    });

    insertMany(dtos);
    return events;
  }

  findById(id: string): Event | undefined {
    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.eventType as EventType,
      serviceName: row.serviceName,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  findAll(options?: {
    serviceName?: string;
    eventType?: EventType;
    startTime?: number;
    endTime?: number;
  }): Event[] {
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    if (options?.serviceName) {
      query += ' AND serviceName = ?';
      params.push(options.serviceName);
    }

    if (options?.eventType) {
      query += ' AND eventType = ?';
      params.push(options.eventType);
    }

    if (options?.startTime !== undefined) {
      query += ' AND timestamp >= ?';
      params.push(options.startTime);
    }

    if (options?.endTime !== undefined) {
      query += ' AND timestamp <= ?';
      params.push(options.endTime);
    }

    query += ' ORDER BY timestamp DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.eventType as EventType,
      serviceName: row.serviceName,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM events WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  clear(): void {
    db.exec('DELETE FROM events');
  }

  count(): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM events');
    const row = stmt.get() as any;
    return row.count;
  }

  listServices(): string[] {
    const stmt = db.prepare('SELECT DISTINCT serviceName FROM events ORDER BY serviceName');
    const rows = stmt.all() as any[];
    return rows.map((row) => row.serviceName);
  }
}

export const eventStore = new EventStore();

