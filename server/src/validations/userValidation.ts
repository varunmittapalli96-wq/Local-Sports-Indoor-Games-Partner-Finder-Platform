import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional(),
  ageGroup: z.enum(['18-24', '25-34', '35-44', '45-54', '55+']).optional(),
  bio: z.string().max(500).optional(),
  locality: z.string().min(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photo: z.string().optional(),
  contactPreference: z.enum(['whatsapp', 'phone', 'email']).optional(),
  contactValue: z.string().min(3).optional(),
  playingLocations: z.array(z.enum(['home', 'clubhouse', 'ground'])).optional(),
  primaryVenue: z.string().optional(),
  womenOnlyPlay: z.boolean().optional(),
  publicPlacesOnly: z.boolean().optional(),
});

export const updateGamesSchema = z.object({
  games: z.array(
    z.object({
      gameId: z.string().min(1, 'Game ID is required'),
      skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    })
  ).min(1, 'Select at least one game'),
});

export const updateAvailabilitySchema = z.object({
  availabilities: z.array(
    z.object({
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      slots: z.array(
        z.object({
          slotType: z.enum(['morning', 'afternoon', 'evening', 'custom']),
          start: z.string(),
          end: z.string(),
        })
      ),
    })
  ),
});
