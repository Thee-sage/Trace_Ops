import mongoose, { Schema } from 'mongoose';
import { Issue } from './Issue';

export interface IssueDocument extends Omit<Issue, 'id'> {
  _id: string;
}

const IssueSchema = new Schema<IssueDocument>(
  {
    _id: { type: String, required: true },
    serviceName: { type: String, required: true, index: true },
    fingerprint: { type: String, required: true, index: true },
    title: { type: String, required: true },
    firstSeen: { type: Number, required: true },
    lastSeen: { type: Number, required: true },
    count: { type: Number, required: true, default: 0 },
    severity: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'] },
    relatedEventIds: { type: [String], required: true, default: [] },
    suspectedCauseEventId: { type: String },
    status: { type: String, required: true, enum: ['open', 'resolved'], index: true },
    resolvedAt: { type: Number },
    resolvedByEventId: { type: String },
    regressionCount: { type: Number, required: true, default: 0 },
    uniqueRoutes: { type: Number, required: true, default: 0 },
    uniqueUsers: { type: Number },
    errorRate: { type: Number, required: true, default: 0 },
    priorityScore: { type: Number, required: true, default: 0, index: true },
    priorityReason: { type: String },
  },
  {
    timestamps: false,
  }
);

// Compound unique index for serviceName + fingerprint
IssueSchema.index({ serviceName: 1, fingerprint: 1 }, { unique: true });

// Compound index for serviceName + status queries
IssueSchema.index({ serviceName: 1, status: 1 });

// Index for priorityScore DESC queries
IssueSchema.index({ priorityScore: -1 });

export const IssueModel = mongoose.model<IssueDocument>('Issue', IssueSchema);
