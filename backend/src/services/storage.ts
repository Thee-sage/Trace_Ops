// Storage layer abstraction - delegates to SQLite-backed eventStore
import { eventStore } from '../storage/eventStore';
import { Event, CreateEventDto, EventType } from '../models/Event';

// Re-export the storage interface using SQLite-backed implementation
export const storage = eventStore;

