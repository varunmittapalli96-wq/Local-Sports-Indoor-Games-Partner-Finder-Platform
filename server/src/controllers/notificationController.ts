import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });

  return res.status(200).json({
    success: true,
    unreadCount,
    notifications,
  });
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true },
    { new: true }
  );

  return res.status(200).json({
    success: true,
    notification,
  });
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });

  return res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
};
