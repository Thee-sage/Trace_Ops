import mongoose, { Schema } from 'mongoose';
import { Event, EventType } from './Event';

export interface EventDocument extends Omit<Event, 'id'> {
  _id: string;
}

const EventSchema = new Schema<EventDocument>(
  {
    _id: { type: String, required: true },
    timestamp: { type: Number, required: true, index: true },
    eventType: { type: String, required: true, enum: Object.values(EventType), index: true },
    serviceName: { type: String, required: true, index: true },
    message: { type: String, required: true, default: '' },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false,
  }
);

// Compound index for serviceName + timestamp queries
EventSchema.index({ serviceName: 1, timestamp: -1 });

// Compound index for eventType queries
EventSchema.index({ eventType: 1, timestamp: -1 });

export const EventModel = mongoose.model<EventDocument>('Event', EventSchema);
