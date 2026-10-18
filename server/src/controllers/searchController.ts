import { Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserGamePreference } from '../models/UserGamePreference';
import { Availability } from '../models/Availability';
import { Community } from '../models/Community';
import { AuthRequest } from '../middleware/auth';
import { scoreCandidate, UserMatchCandidate } from '../services/matchingService';
import { isUserOnline } from '../services/socketService';

export const searchPlayers = async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();

  const {
    game,
    lat,
    lng,
    radius = '20',
    day,
    time,
    skill,
    womenOnly,
    page = '1',
    limit = '12',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
  const radiusKm = parseFloat(radius as string) || 20;

  // Determine user search location
  let searchLat: number = 12.9716;
  let searchLng: number = 77.5946;

  if (lat && lng) {
    searchLat = parseFloat(lat as string);
    searchLng = parseFloat(lng as string);
  } else if (req.user?.location?.coordinates) {
    searchLng = req.user.location.coordinates[0];
    searchLat = req.user.location.coordinates[1];
  }

  // Base query: active accounts, exclude self and blocked users
  const query: Record<string, any> = {
    status: 'active',
  };

  const excludedIds: mongoose.Types.ObjectId[] = [];
  if (req.user) {
    excludedIds.push(req.user._id);
    if (req.user.blockedUsers?.length) {
      excludedIds.push(...req.user.blockedUsers);
    }
    // Also exclude people who blocked the current user
    query.blockedUsers = { $ne: req.user._id };
  }

  if (excludedIds.length > 0) {
    query._id = { $nin: excludedIds };
  }

  // Women-only safety logic:
  // If requester is male, exclude candidates with womenOnlyPlay: true
  if (req.user?.gender === 'male') {
    query.womenOnlyPlay = { $ne: true };
  }

  // If womenOnly filter is checked, only return female users
  if (womenOnly === 'true' || womenOnly === '1') {
    query.gender = 'female';
  }

  // Geospatial $geoWithin filter ($centerSphere expects radians)
  const radiusInRadians = radiusKm / 6378.1;
  query.location = {
    $geoWithin: {
      $centerSphere: [[searchLng, searchLat], radiusInRadians],
    },
  };

  // Find candidate users
  const candidates = await User.find(query)
    .select('name photo locality ageGroup gender bio location playingLocations primaryVenue womenOnlyPlay publicPlacesOnly createdAt')
    .lean();

  if (candidates.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page: pageNum,
      totalPages: 0,
      executionTimeMs: Date.now() - startTime,
      players: [],
    });
  }

  const candidateIds = candidates.map((c) => c._id);

  // Fetch games & availability for candidates
  const [candidateGames, candidateAvails, candidateCommunities] = await Promise.all([
    UserGamePreference.find({ user: { $in: candidateIds } }).populate('game').lean(),
    Availability.find({ user: { $in: candidateIds } }).lean(),
    Community.find({ 'members.user': { $in: candidateIds }, verificationStatus: 'verified' }).lean(),
  ]);

  // If a specific game is requested, filter candidates who play that game
  let filteredCandidates = candidates;
  if (game && mongoose.Types.ObjectId.isValid(game as string)) {
    const gameObjId = new mongoose.Types.ObjectId(game as string);
    const usersWithGame = new Set(
      candidateGames
        .filter((cg: any) => cg.game && (cg.game._id?.equals(gameObjId) || cg.game.toString() === game))
        .map((cg) => cg.user.toString())
    );
    filteredCandidates = candidates.filter((c) => usersWithGame.has(c._id.toString()));
  }

  // If skill level is requested and game is specified, optionally filter or rank
  if (skill && game) {
    // We let the matching score prioritize skill, but we can also filter if strict
  }

  // Get current user games/availability/communities for overlap calculation
  let currentUserGames: any[] = [];
  let currentUserAvail: any[] = [];
  let currentUserCommunities: string[] = [];

  if (req.user) {
    const [uGames, uAvail, uComm] = await Promise.all([
      UserGamePreference.find({ user: req.user._id }).lean(),
      Availability.find({ user: req.user._id }).lean(),
      Community.find({ 'members.user': req.user._id }).lean(),
    ]);
    currentUserGames = uGames.map((g) => ({ gameId: g.game.toString(), skillLevel: g.skillLevel }));
    currentUserAvail = uAvail.map((a) => ({ dayOfWeek: a.dayOfWeek, slots: a.slots }));
    currentUserCommunities = uComm.map((c) => c._id.toString());
  }

  // Group candidate data
  const candidateGamesMap = new Map<string, any[]>();
  for (const cg of candidateGames) {
    const uId = cg.user.toString();
    if (!candidateGamesMap.has(uId)) candidateGamesMap.set(uId, []);
    candidateGamesMap.get(uId)!.push({
      gameId: (cg.game as any)?._id?.toString() || cg.game.toString(),
      gameName: (cg.game as any)?.name || 'Game',
      skillLevel: cg.skillLevel,
    });
  }

  const candidateAvailMap = new Map<string, any[]>();
  for (const ca of candidateAvails) {
    const uId = ca.user.toString();
    if (!candidateAvailMap.has(uId)) candidateAvailMap.set(uId, []);
    candidateAvailMap.get(uId)!.push({
      dayOfWeek: ca.dayOfWeek,
      slots: ca.slots,
    });
  }

  const candidateCommMap = new Map<string, string[]>();
  for (const comm of candidateCommunities) {
    for (const mem of comm.members) {
      const uId = mem.user.toString();
      if (!candidateCommMap.has(uId)) candidateCommMap.set(uId, []);
      candidateCommMap.get(uId)!.push(comm._id.toString());
    }
  }

  // Score each candidate
  const scored = filteredCandidates.map((c) => {
    const uId = c._id.toString();
    const cGames = candidateGamesMap.get(uId) || [];
    const cAvail = candidateAvailMap.get(uId) || [];
    const cComms = candidateCommMap.get(uId) || [];

    const matchCandidate: UserMatchCandidate = {
      _id: uId,
      name: c.name,
      photo: c.photo,
      locality: c.locality,
      ageGroup: c.ageGroup,
      gender: c.gender,
      bio: c.bio,
      location: c.location,
      playingLocations: c.playingLocations,
      womenOnlyPlay: c.womenOnlyPlay,
      publicPlacesOnly: c.publicPlacesOnly,
      games: cGames,
      availability: cAvail,
      communities: cComms,
    };

    return scoreCandidate(matchCandidate, {
      currentUserId: req.user?._id?.toString(),
      userLat: searchLat,
      userLng: searchLng,
      maxRadiusKm: radiusKm,
      targetGameId: game as string,
      targetSkill: skill as any,
      targetDay: day as string,
      targetTimeSlot: time as string,
      userGender: req.user?.gender,
      userGames: currentUserGames,
      userAvailability: currentUserAvail,
      userCommunities: currentUserCommunities,
    });
  });

  // Sort by Best Matches first (matchingScore descending)
  scored.sort((a, b) => b.matchingScore - a.matchingScore);

  // Pagination
  const total = scored.length;
  const totalPages = Math.ceil(total / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = scored.slice(startIndex, startIndex + limitNum);

  // Privacy formatting: fuzz coordinates (~200m) and show approximate distance text
  const safeResults = paginated.map((item) => {
    const rawCoords = item.player.location.coordinates;
    const fuzzedLng = Number((rawCoords[0] + 0.002).toFixed(4));
    const fuzzedLat = Number((rawCoords[1] + 0.002).toFixed(4));

    return {
      id: item.player._id,
      name: item.player.name,
      photo: item.player.photo,
      locality: item.player.locality,
      ageGroup: item.player.ageGroup,
      gender: item.player.gender,
      bio: item.player.bio,
      approximateDistance: `~${item.distanceKm} km`,
      distanceKm: item.distanceKm,
      fuzzedLocation: { lat: fuzzedLat, lng: fuzzedLng },
      playingLocations: item.player.playingLocations,
      womenOnlyPlay: item.player.womenOnlyPlay,
      publicPlacesOnly: item.player.publicPlacesOnly,
      games: item.player.games,
      availability: item.player.availability,
      matchingScore: item.matchingScore,
      scoreBreakdown: item.scoreBreakdown,
      isOnline: isUserOnline(item.player._id),
    };
  });

  const executionTimeMs = Date.now() - startTime;

  return res.status(200).json({
    success: true,
    count: safeResults.length,
    total,
    page: pageNum,
    totalPages,
    executionTimeMs,
    players: safeResults,
  });
};
