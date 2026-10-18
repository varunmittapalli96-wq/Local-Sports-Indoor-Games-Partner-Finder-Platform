import mongoose, { Schema, Document } from 'mongoose';

export interface IRecurringSession extends Document {
  community: mongoose.Types.ObjectId;
  game: mongoose.Types.ObjectId;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string; // e.g. "18:00"
  venue: string;
  maxParticipants: number;
  participants: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringSessionSchema = new Schema<IRecurringSession>(
  {
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    maxParticipants: { type: Number, default: 8 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RecurringSessionSchema.index({ community: 1, isActive: 1 });
RecurringSessionSchema.index({ game: 1 });

export const RecurringSession = mongoose.model<IRecurringSession>(
  'RecurringSession',
  RecurringSessionSchema
);
