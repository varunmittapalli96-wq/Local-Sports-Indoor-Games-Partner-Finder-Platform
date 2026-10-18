import { Response } from 'express';
import { User } from '../models/User';
import { PlayRequest } from '../models/PlayRequest';
import { Community } from '../models/Community';
import { Game } from '../models/Game';
import { Report } from '../models/Report';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import {
  emitToUser,
  emitToAdmin,
  emitToAll,
  broadcastActivity,
} from '../services/socketService';

export const getAdminKpis = async (_req: AuthRequest, res: Response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Parallel aggregations for speed
  const [
    totalUsers,
    mauCount,
    totalRequests,
    activeRequests,
    successfulRequests,
    gamesCount,
    communitiesCount,
    pendingReports,
    gameDistribution,
    localityDistribution,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActiveAt: { $gte: thirtyDaysAgo } }),
    PlayRequest.countDocuments(),
    PlayRequest.countDocuments({ status: { $in: ['pending', 'accepted'] } }),
    PlayRequest.countDocuments({ status: { $in: ['accepted', 'completed'] } }),
    Game.countDocuments({ isActive: true }),
    Community.countDocuments({ verificationStatus: 'verified' }),
    Report.countDocuments({ status: 'pending' }),
    // Group requests by game
    PlayRequest.aggregate([
      { $group: { _id: '$game', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'games',
          localField: '_id',
          foreignField: '_id',
          as: 'gameDetails',
        },
      },
      { $unwind: '$gameDetails' },
      { $project: { name: '$gameDetails.name', count: 1 } },
    ]),
    // Group users by locality
    User.aggregate([
      { $group: { _id: '$locality', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // Successful match rate = (accepted + completed) / total * 100
  const matchRate = totalRequests > 0 ? Number(((successfulRequests / totalRequests) * 100).toFixed(1)) : 0;

  // Repeat engagement rate: users with 2+ completed sessions / total active users
  const completedSessionsByUser = await PlayRequest.aggregate([
    { $match: { status: 'completed' } },
    { $project: { participants: ['$sender', '$receiver'] } },
    { $unwind: '$participants' },
    { $group: { _id: '$participants', completedCount: { $sum: 1 } } },
    { $match: { completedCount: { $gte: 2 } } },
  ]);

  const repeatCount = completedSessionsByUser.length;
  const activeUserCount = mauCount || totalUsers;
  const repeatEngagementRate = activeUserCount > 0 ? Number(((repeatCount / activeUserCount) * 100).toFixed(1)) : 0;

  return res.status(200).json({
    success: true,
    kpis: {
      registeredUsers: totalUsers,
      monthlyActiveUsers: mauCount,
      activePlayRequests: activeRequests,
      totalPlayRequests: totalRequests,
      successfulMatchRate: matchRate,
      repeatEngagementRate: repeatEngagementRate,
      totalCommunities: communitiesCount,
      activeGames: gamesCount,
      pendingReportsCount: pendingReports,
    },
    charts: {
      gameDistribution,
      localityDistribution,
    },
  });
};

export const getAdminUsers = async (req: AuthRequest, res: Response) => {
  const { search, status, role, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;

  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } },
      { locality: { $regex: search as string, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;
  if (role) filter.role = role;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return res.status(200).json({
    success: true,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    users,
  });
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, role } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (status) user.status = status;
  if (role) user.role = role;

  await user.save();

  // Real-time WebSocket dispatches
  emitToUser(user._id.toString(), 'user:status_changed', { status: user.status, role: user.role });
  emitToAdmin('admin:user_updated', { userId: user._id, status: user.status, role: user.role, name: user.name });
  broadcastActivity({
    action: 'ADMIN_USER_UPDATED',
    title: 'User Profile Updated by Admin',
    description: `User ${user.name} (${user.email}) status changed to ${user.status}`,
    entity: 'User',
    entityId: user._id.toString(),
    meta: { status, role, userEmail: user.email },
    actorId: req.user!._id.toString(),
    actorEmail: req.user!.email,
  });

  return res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    user,
  });
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  await ActivityLog.create({
    actor: req.user!._id,
    actorEmail: req.user!.email,
    action: 'ADMIN_USER_DELETED',
    entity: 'User',
    entityId: id,
    meta: { userEmail: user.email },
  });

  return res.status(200).json({
    success: true,
    message: 'User deleted permanently',
  });
};

export const getAdminCommunities = async (_req: AuthRequest, res: Response) => {
  const communities = await Community.find()
    .populate('organizer', 'name email')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    communities,
  });
};

export const verifyCommunity = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'verified' | 'rejected'

  const community = await Community.findByIdAndUpdate(
    id,
    { verificationStatus: status },
    { new: true }
  );

  if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

  // Real-time WebSocket dispatches
  emitToAll('community:verification_changed', { communityId: id, status, name: community.name });
  emitToAdmin('admin:community_updated', { communityId: id, status, name: community.name });
  broadcastActivity({
    action: 'COMMUNITY_VERIFICATION_UPDATED',
    title: `Community Group ${status === 'verified' ? 'Verified ✅' : 'Rejected ❌'}`,
    description: `${community.name} was marked as ${status} by Admin`,
    entity: 'Community',
    entityId: id,
    meta: { verificationStatus: status, name: community.name },
    actorId: req.user!._id.toString(),
    actorEmail: req.user!.email,
  });

  return res.status(200).json({
    success: true,
    message: `Community status changed to ${status}`,
    community,
  });
};

export const adminManageGames = {
  create: async (req: AuthRequest, res: Response) => {
    const gameSchema = z.object({
      name: z.string().min(2),
      category: z.enum(['indoor', 'outdoor']),
      minPlayers: z.number().min(1).default(2),
      maxPlayers: z.number().min(2).default(4),
      icon: z.string().default('trophy'),
      description: z.string().optional().default(''),
    });
    const validated = gameSchema.parse(req.body);

    const game = await Game.create(validated);

    // Real-time WebSocket dispatches
    emitToAll('game:created', game);
    emitToAdmin('admin:game_created', game);
    broadcastActivity({
      action: 'GAME_CREATED',
      title: 'New Game Added to Platform',
      description: `New game category "${game.name}" (${game.category}) was added`,
      entity: 'Game',
      entityId: game._id.toString(),
      actorId: req.user!._id.toString(),
      actorEmail: req.user!.email,
    });

    return res.status(201).json({ success: true, game });
  },

  update: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const game = await Game.findByIdAndUpdate(id, req.body, { new: true });
    if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
    emitToAll('game:updated', game);
    return res.status(200).json({ success: true, game });
  },

  delete: async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await Game.findByIdAndUpdate(id, { isActive: false });
    emitToAll('game:deactivated', { id });
    return res.status(200).json({ success: true, message: 'Game deactivated' });
  },
};

export const getAdminReports = async (_req: AuthRequest, res: Response) => {
  const reports = await Report.find()
    .populate('reporter', 'name email locality')
    .populate('reportedUser', 'name email locality status')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    reports,
  });
};

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminNote, suspendUser } = req.body;

  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  if (status) report.status = status;
  if (adminNote) report.adminNote = adminNote;
  report.reviewedBy = req.user!._id;
  await report.save();

  if (suspendUser && report.reportedUser) {
    await User.findByIdAndUpdate(report.reportedUser, { status: 'suspended' });
    emitToUser(report.reportedUser.toString(), 'user:status_changed', { status: 'suspended' });
  }

  // Real-time WebSocket dispatches
  emitToAdmin('admin:report_resolved', {
    reportId: id,
    status,
    adminNote,
    suspendUser,
  });
  broadcastActivity({
    action: 'REPORT_RESOLVED',
    title: 'Report Moderation Completed',
    description: `Report was marked as ${status}${suspendUser ? ' (User suspended)' : ''}`,
    entity: 'Report',
    entityId: id,
    meta: { status, suspendUser },
    actorId: req.user!._id.toString(),
    actorEmail: req.user!.email,
  });

  return res.status(200).json({
    success: true,
    message: 'Report updated successfully',
    report,
  });
};

export const getActivityLogs = async (_req: AuthRequest, res: Response) => {
  const logs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json({
    success: true,
    count: logs.length,
    logs,
  });
};
