import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'organizer' | 'admin';
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other';
  ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  photo?: string;
  bio?: string;
  locality: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  contactPreference: 'whatsapp' | 'phone' | 'email';
  contactValue: string;
  playingLocations: ('home' | 'clubhouse' | 'ground')[];
  primaryVenue?: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  status: 'active' | 'suspended';
  womenOnlyPlay: boolean;
  publicPlacesOnly: boolean;
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  lastActiveAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'],
      default: 'prefer-not-to-say',
    },
    ageGroup: {
      type: String,
      enum: ['18-24', '25-34', '35-44', '45-54', '55+'],
      default: '25-34',
    },
    photo: { type: String, default: '' },
    bio: { type: String, default: '', maxLength: 500 },
    locality: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        default: [77.5946, 12.9716],
      },
    },
    contactPreference: {
      type: String,
      enum: ['whatsapp', 'phone', 'email'],
      default: 'whatsapp',
    },
    contactValue: { type: String, required: true, trim: true },
    playingLocations: {
      type: [String],
      enum: ['home', 'clubhouse', 'ground'],
      default: ['clubhouse', 'ground'],
    },
    primaryVenue: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    womenOnlyPlay: { type: Boolean, default: false },
    publicPlacesOnly: { type: Boolean, default: false },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Geospatial index for nearby discovery
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ locality: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

export const ensureDefaultAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL?.trim() || 'admin@playnear.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      console.log(`[Database] No admin found. Auto-creating default admin account (${adminEmail})...`);
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(adminPassword, 10);
      await User.create({
        name: 'PlayNear Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        gender: 'prefer-not-to-say',
        ageGroup: '25-34',
        locality: 'Indiranagar',
        location: { type: 'Point', coordinates: [77.6408, 12.9784] },
        contactPreference: 'email',
        contactValue: adminEmail,
        playingLocations: ['clubhouse', 'ground'],
        primaryVenue: 'Indiranagar Club',
        emailVerified: true,
        status: 'active',
        bio: 'Platform Administrator and community recreation advocate.',
      });
      console.log('[Database] Default admin account created successfully.');
    }
  } catch (err: any) {
    console.error('[Database] Error ensuring default admin:', err.message);
  }
};
