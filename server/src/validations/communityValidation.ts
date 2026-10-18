import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(80),
  type: z.enum(['society', 'club', 'neighborhood', 'corporate']),
  locality: z.string().min(2),
  lat: z.number().min(-90).max(90).optional().default(12.9716),
  lng: z.number().min(-180).max(180).optional().default(77.5946),
  description: z.string().max(1000).optional().default(''),
  rules: z.string().max(1000).optional().default('Respect everyone and follow society guidelines.'),
  logo: z.string().optional().default(''),
});

export const joinCommunitySchema = z.object({
  inviteCode: z.string().optional(),
});

export const updateMemberSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'remove', 'promote_moderator']),
});

export const createOpenPostSchema = z.object({
  gameId: z.string().min(1),
  dateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid date and time required',
  }),
  spotsNeeded: z.number().min(1).max(20).default(2),
  venue: z.string().min(2),
  description: z.string().max(500).optional().default(''),
});

export const createRecurringSessionSchema = z.object({
  gameId: z.string().min(1),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  time: z.string().min(4), // e.g. "18:00"
  venue: z.string().min(2),
  maxParticipants: z.number().min(2).max(50).default(8),
});
