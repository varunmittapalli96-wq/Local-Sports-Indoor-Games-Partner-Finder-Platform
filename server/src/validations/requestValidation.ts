import { z } from 'zod';

export const createRequestSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  gameId: z.string().min(1, 'Game ID is required'),
  proposedDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid proposed date and time is required',
  }),
  durationMinutes: z.number().min(30).max(240).optional().default(60),
  locationType: z.enum(['home', 'clubhouse', 'ground']),
  venue: z.string().optional().default(''),
  message: z.string().max(500).optional().default(''),
});

export const cancelRequestSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const completeRequestSchema = z.object({
  noShowReported: z.boolean().optional().default(false),
  noShowReason: z.string().optional(),
});
