import mongoose, { Schema, Document } from 'mongoose';

export interface IUserGamePreference extends Document {
  user: mongoose.Types.ObjectId;
  game: mongoose.Types.ObjectId;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

const UserGamePreferenceSchema = new Schema<IUserGamePreference>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
      default: 'intermediate',
    },
  },
  { timestamps: true }
);

UserGamePreferenceSchema.index({ user: 1, game: 1 }, { unique: true });
UserGamePreferenceSchema.index({ game: 1, skillLevel: 1 });

export const UserGamePreference = mongoose.model<IUserGamePreference>(
  'UserGamePreference',
  UserGamePreferenceSchema
);
