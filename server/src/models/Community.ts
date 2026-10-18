import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityMember {
  user: mongoose.Types.ObjectId;
  role: 'member' | 'moderator' | 'organizer';
  status: 'pending' | 'approved' | 'rejected';
  joinedAt: Date;
}

export interface ICommunity extends Document {
  name: string;
  slug: string;
  type: 'society' | 'club' | 'neighborhood' | 'corporate';
  locality: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  description: string;
  rules: string;
  logo: string;
  organizer: mongoose.Types.ObjectId;
  members: ICommunityMember[];
  inviteCode: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CommunityMemberSchema = new Schema<ICommunityMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['member', 'moderator', 'organizer'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommunitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ['society', 'club', 'neighborhood', 'corporate'],
      default: 'society',
    },
    locality: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [77.5946, 12.9716],
      },
    },
    description: { type: String, default: '' },
    rules: { type: String, default: 'Be respectful, arrive on time, enjoy the game!' },
    logo: { type: String, default: '' },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [CommunityMemberSchema],
    inviteCode: { type: String, required: true, unique: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

CommunitySchema.index({ locality: 1 });
CommunitySchema.index({ verificationStatus: 1 });
CommunitySchema.index({ 'members.user': 1 });

export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
