import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
  name: string;
  category: 'indoor' | 'outdoor';
  minPlayers: number;
  maxPlayers: number;
  icon: string;
  description?: string;
  isActive: boolean;
}

const GameSchema = new Schema<IGame>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ['indoor', 'outdoor'], required: true },
    minPlayers: { type: Number, required: true, default: 2 },
    maxPlayers: { type: Number, required: true, default: 4 },
    icon: { type: String, default: 'trophy' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GameSchema.index({ category: 1 });
GameSchema.index({ isActive: 1 });

export const Game = mongoose.model<IGame>('Game', GameSchema);
