import { Request, Response } from 'express';
import { User } from '../models/User';
import { PlayRequest } from '../models/PlayRequest';
import { Community } from '../models/Community';
import { Game } from '../models/Game';
import { UserGamePreference } from '../models/UserGamePreference';
import { ActivityLog } from '../models/ActivityLog';
import { getOnlineUserIds } from '../services/socketService';

export const getRealtimeStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeRequests,
      completedMatches,
      totalCommunities,
      gamesList,
      gamePrefCounts,
      localityDistribution,
      recentLogs,
    ] = await Promise.all([
      User.countDocuments({ status: 'active', role: { $in: ['user', 'organizer'] } }),
      PlayRequest.countDocuments({ status: { $in: ['pending', 'accepted'] } }),
      PlayRequest.countDocuments({ status: 'completed' }),
      Community.countDocuments({ verificationStatus: 'verified' }),
      Game.find({ isActive: true }).lean(),
      UserGamePreference.aggregate([
        { $group: { _id: '$game', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { status: 'active', locality: { $exists: true, $ne: '' } } },
        { $group: { _id: '$locality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Map player counts to each game
    const countMap = new Map(gamePrefCounts.map((g) => [g._id.toString(), g.count]));
    const popularGames = gamesList.map((g) => {
      const playerCount = countMap.get(g._id.toString()) || 0;
      return {
        _id: g._id,
        name: g.name,
        category: g.category,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        icon: g.icon || 'trophy',
        description: g.description || '',
        playerCount,
        countDisplay: `${playerCount} active players`,
      };
    }).sort((a, b) => b.playerCount - a.playerCount);

    const onlineCount = getOnlineUserIds().length;

    // Format recent activities for live ticker
    const activities = recentLogs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      entity: log.entity,
      meta: log.meta,
      createdAt: log.createdAt,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeRequests,
        completedMatches,
        totalCommunities,
        onlineCount,
        popularGames,
        localities: localityDistribution.map((l) => ({ name: l._id, count: l.count })),
        activities,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Error computing realtime stats',
      error: err.message,
    });
  }
};
