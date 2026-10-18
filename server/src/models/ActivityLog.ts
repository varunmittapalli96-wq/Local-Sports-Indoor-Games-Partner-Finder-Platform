import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  actor?: mongoose.Types.ObjectId;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ actor: 1 });
ActivityLogSchema.index({ entity: 1 });

export const ActivityLog = mongoose.model<IActivityLog>(
  'ActivityLog',
  ActivityLogSchema
);
