import { Response } from 'express';
import { z } from 'zod';
import { Report } from '../models/Report';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { ActivityLog } from '../models/ActivityLog';
import { emitToAdmin, broadcastActivity } from '../services/socketService';

const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  reason: z.string().min(3).max(100),
  details: z.string().max(1000).optional().default(''),
});

export const createReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { reportedUserId, reason, details } = reportSchema.parse(req.body);

  if (reportedUserId === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot report yourself.' });
  }

  const target = await User.findById(reportedUserId);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Target user not found.' });
  }

  const report = await Report.create({
    reporter: req.user._id,
    reportedUser: target._id,
    reason,
    details,
    status: 'pending',
  });

  // Real-time broadcast to Admin room
  emitToAdmin('admin:new_report', {
    reportId: report._id,
    reporterName: req.user.name,
    reportedUserName: target.name,
    reportedUserEmail: target.email,
    reason,
    details,
    timestamp: new Date().toISOString(),
  });

  broadcastActivity({
    action: 'USER_REPORTED',
    title: 'Safety Report Submitted',
    description: `Report submitted regarding community guidelines violation`,
    entity: 'Report',
    entityId: report._id.toString(),
    meta: { reportedEmail: target.email, reason },
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  return res.status(201).json({
    success: true,
    message: 'Thank you for your report. Our safety and moderation team will review this promptly.',
    report,
  });
};
