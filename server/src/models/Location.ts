import mongoose, { Schema, Document } from 'mongoose';

export interface ILocationVenue extends Document {
  name: string;
  type: 'home' | 'clubhouse' | 'ground';
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  community?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}

const LocationVenueSchema = new Schema<ILocationVenue>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['home', 'clubhouse', 'ground'], required: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    community: { type: Schema.Types.ObjectId, ref: 'Community' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LocationVenueSchema.index({ location: '2dsphere' });

export const LocationVenue = mongoose.model<ILocationVenue>(
  'LocationVenue',
  LocationVenueSchema
);
