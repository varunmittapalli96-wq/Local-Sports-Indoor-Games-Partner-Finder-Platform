import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  locality: z.string().trim().min(2, 'Locality is required'),
  lat: z.number().min(-90).max(90).optional().default(12.9716),
  lng: z.number().min(-180).max(180).optional().default(77.5946),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional().default('prefer-not-to-say'),
  ageGroup: z.enum(['18-24', '25-34', '35-44', '45-54', '55+']).optional().default('25-34'),
  contactPreference: z.enum(['whatsapp', 'phone', 'email']).optional().default('whatsapp'),
  contactValue: z.string().trim().min(3, 'Contact value is required'),
  playingLocations: z.array(z.enum(['home', 'clubhouse', 'ground'])).optional().default(['clubhouse', 'ground']),
  primaryVenue: z.string().trim().optional(),
  womenOnlyPlay: z.boolean().optional().default(false),
  publicPlacesOnly: z.boolean().optional().default(false),
  bio: z.string().trim().max(500).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  password: z.string().min(6, 'New password must be at least 6 characters'),
});
