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

export const DEFAULT_GAMES = [
  { name: 'Badminton', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'badminton', description: 'Fast-paced racquet sport for singles or doubles' },
  { name: 'Table Tennis', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'table-tennis', description: 'Quick reflexes and ping pong rallies' },
  { name: 'Chess', category: 'indoor' as const, minPlayers: 2, maxPlayers: 2, icon: 'chess', description: 'Strategic board game for analytical minds' },
  { name: 'Carrom', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'circle-dot', description: 'Traditional strike-and-pocket tabletop game' },
  { name: 'Cards & Board Games', category: 'indoor' as const, minPlayers: 2, maxPlayers: 8, icon: 'spade', description: 'Casual card games, Catan, Scrabble and more' },
  { name: 'Cricket (Box / Turf)', category: 'outdoor' as const, minPlayers: 6, maxPlayers: 14, icon: 'shield', description: 'Gully cricket, box turf matches and nets' },
  { name: 'Football (Turf / Field)', category: 'outdoor' as const, minPlayers: 4, maxPlayers: 12, icon: 'circle', description: '5-a-side, 7-a-side and pickup soccer' },
  { name: 'Tennis', category: 'outdoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'target', description: 'Lawn tennis singles and doubles on hard/clay courts' },
  { name: 'Squash', category: 'indoor' as const, minPlayers: 2, maxPlayers: 2, icon: 'box', description: 'High-energy indoor wall-ball racquet sport' },
  { name: 'Basketball', category: 'outdoor' as const, minPlayers: 2, maxPlayers: 10, icon: 'dribbble', description: 'Half-court 3v3 or full-court 5v5 pickup hoops' },
];

export const ensureDefaultGames = async () => {
  try {
    const count = await Game.countDocuments();
    if (count === 0) {
      console.log('[Game] No games found in database. Auto-seeding 10 standard sports & indoor games...');
      await Game.insertMany(DEFAULT_GAMES);
      console.log('[Game] Standard sports & indoor games seeded successfully.');
    }
  } catch (err: any) {
    console.error('[Game] Error auto-seeding default games:', err.message);
  }
};
