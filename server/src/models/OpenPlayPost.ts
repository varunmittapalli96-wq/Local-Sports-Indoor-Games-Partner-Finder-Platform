import mongoose, { Schema, Document } from 'mongoose';

export interface IOpenPlayPost extends Document {
  community: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  game: mongoose.Types.ObjectId;
  dateTime: Date;
  spotsNeeded: number;
  venue: string;
  description: string;
  participants: mongoose.Types.ObjectId[];
  status: 'open' | 'full' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const OpenPlayPostSchema = new Schema<IOpenPlayPost>(
  {
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    dateTime: { type: Date, required: true },
    spotsNeeded: { type: Number, required: true, default: 2, min: 1 },
    venue: { type: String, required: true },
    description: { type: String, default: '' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['open', 'full', 'cancelled', 'completed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

OpenPlayPostSchema.index({ community: 1, status: 1 });
OpenPlayPostSchema.index({ dateTime: 1 });
OpenPlayPostSchema.index({ game: 1 });

export const OpenPlayPost = mongoose.model<IOpenPlayPost>('OpenPlayPost', OpenPlayPostSchema);
