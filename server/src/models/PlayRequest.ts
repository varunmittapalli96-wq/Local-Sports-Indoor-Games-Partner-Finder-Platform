import mongoose, { Schema, Document } from 'mongoose';

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | 'completed';

export interface INoShowFlag {
  reportedBy: mongoose.Types.ObjectId;
  reason: string;
  reportedAt: Date;
}

export interface IPlayRequest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  game: mongoose.Types.ObjectId;
  proposedDateTime: Date;
  durationMinutes: number;
  locationType: 'home' | 'clubhouse' | 'ground';
  venue?: string;
  message?: string;
  status: RequestStatus;
  respondedAt?: Date;
  completedAt?: Date;
  cancellationReason?: string;
  noShowFlags: INoShowFlag[];
  createdAt: Date;
  updatedAt: Date;
}

const NoShowFlagSchema = new Schema<INoShowFlag>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PlayRequestSchema = new Schema<IPlayRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    proposedDateTime: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    locationType: {
      type: String,
      enum: ['home', 'clubhouse', 'ground'],
      required: true,
    },
    venue: { type: String, default: '' },
    message: { type: String, default: '', maxLength: 500 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired', 'completed'],
      default: 'pending',
    },
    respondedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String },
    noShowFlags: [NoShowFlagSchema],
  },
  { timestamps: true }
);

PlayRequestSchema.index({ sender: 1, status: 1 });
PlayRequestSchema.index({ receiver: 1, status: 1 });
PlayRequestSchema.index({ proposedDateTime: 1 });
PlayRequestSchema.index({ status: 1, proposedDateTime: 1 });
PlayRequestSchema.index({ game: 1 });

export const PlayRequest = mongoose.model<IPlayRequest>('PlayRequest', PlayRequestSchema);
