import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type:
    | 'request_received'
    | 'request_accepted'
    | 'request_declined'
    | 'request_cancelled'
    | 'session_reminder'
    | 'session_completed'
    | 'community_invite'
    | 'general';
  title: string;
  message: string;
  payload?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'request_received',
        'request_accepted',
        'request_declined',
        'request_cancelled',
        'session_reminder',
        'session_completed',
        'community_invite',
        'general',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
