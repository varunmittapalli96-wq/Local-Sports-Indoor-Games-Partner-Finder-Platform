import mongoose, { Schema, Document } from 'mongoose';

export interface ISlot {
  slotType: 'morning' | 'afternoon' | 'evening' | 'custom';
  start: string; // e.g. "06:00"
  end: string;   // e.g. "09:00"
}

export interface IAvailability extends Document {
  user: mongoose.Types.ObjectId;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  slots: ISlot[];
}

const SlotSchema = new Schema<ISlot>(
  {
    slotType: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'custom'],
      required: true,
    },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const AvailabilitySchema = new Schema<IAvailability>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    slots: [SlotSchema],
  },
  { timestamps: true }
);

AvailabilitySchema.index({ user: 1, dayOfWeek: 1 }, { unique: true });

export const Availability = mongoose.model<IAvailability>(
  'Availability',
  AvailabilitySchema
);
