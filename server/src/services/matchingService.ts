export interface UserMatchCandidate {
  _id: string;
  name: string;
  photo?: string;
  locality: string;
  ageGroup: string;
  gender?: string;
  bio?: string;
  location: { coordinates: [number, number] };
  distanceMeters?: number;
  games: Array<{ gameId: string; gameName: string; skillLevel: 'beginner' | 'intermediate' | 'advanced' }>;
  availability: Array<{ dayOfWeek: string; slots: Array<{ slotType: string; start: string; end: string }> }>;
  communities?: string[];
  playingLocations?: string[];
  womenOnlyPlay?: boolean;
  publicPlacesOnly?: boolean;
}

export interface MatchingCriteria {
  currentUserId?: string;
  userLat?: number;
  userLng?: number;
  maxRadiusKm?: number;
  targetGameId?: string;
  targetSkill?: 'beginner' | 'intermediate' | 'advanced';
  targetDay?: string;
  targetTimeSlot?: string;
  userGender?: string;
  womenOnlyFilter?: boolean;
  userCommunities?: string[];
  userGames?: Array<{ gameId: string; skillLevel: string }>;
  userAvailability?: Array<{ dayOfWeek: string; slots: Array<{ slotType: string; start: string; end: string }> }>;
}

export interface ScoredCandidate {
  player: UserMatchCandidate;
  distanceKm: number;
  matchingScore: number;
  scoreBreakdown: {
    distanceScore: number;     // max 40
    availabilityScore: number; // max 30
    skillScore: number;        // max 20
    sharedGamesScore: number;  // max 10
  };
}

/**
 * Calculates Great-circle distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Computes skill proximity score (0 - 20)
 */
export const computeSkillCloseness = (
  targetSkill?: string,
  candidateSkill?: string
): number => {
  if (!targetSkill || !candidateSkill) return 10; // neutral default
  if (targetSkill.toLowerCase() === candidateSkill.toLowerCase()) return 20;

  const order = ['beginner', 'intermediate', 'advanced'];
  const diff = Math.abs(
    order.indexOf(targetSkill.toLowerCase()) - order.indexOf(candidateSkill.toLowerCase())
  );

  if (diff === 1) return 12; // e.g., Beginner vs Intermediate
  return 5; // e.g., Beginner vs Advanced
};

/**
 * Computes availability overlap score (0 - 30)
 */
export const computeAvailabilityOverlap = (
  userAvail: Array<{ dayOfWeek: string; slots: Array<{ slotType: string }> }> = [],
  candidateAvail: Array<{ dayOfWeek: string; slots: Array<{ slotType: string }> }> = [],
  targetDay?: string,
  targetSlotType?: string
): number => {
  if (targetDay && targetSlotType) {
    const hasCandidateMatch = candidateAvail.some(
      (a) =>
        a.dayOfWeek.toLowerCase() === targetDay.toLowerCase() &&
        a.slots.some((s) => s.slotType.toLowerCase() === targetSlotType.toLowerCase())
    );
    return hasCandidateMatch ? 30 : 5;
  }

  // Cross-compare days and slots
  let matchingSlotDays = 0;
  for (const u of userAvail) {
    const match = candidateAvail.find(
      (c) => c.dayOfWeek.toLowerCase() === u.dayOfWeek.toLowerCase()
    );
    if (match) {
      const uSlots = new Set(u.slots.map((s) => s.slotType.toLowerCase()));
      const hasSlotOverlap = match.slots.some((s) => uSlots.has(s.slotType.toLowerCase()));
      if (hasSlotOverlap) matchingSlotDays++;
    }
  }

  if (matchingSlotDays >= 3) return 30;
  if (matchingSlotDays === 2) return 22;
  if (matchingSlotDays === 1) return 15;
  return 8; // base minimal score
};

/**
 * Computes shared games and community score (0 - 10)
 */
export const computeSharedGamesScore = (
  userGames: Array<{ gameId: string }> = [],
  candidateGames: Array<{ gameId: string }> = [],
  userCommunities: string[] = [],
  candidateCommunities: string[] = []
): number => {
  let score = 0;
  const userGameIds = new Set(userGames.map((g) => g.gameId.toString()));
  const sharedGamesCount = candidateGames.filter((cg) => userGameIds.has(cg.gameId.toString())).length;

  if (sharedGamesCount >= 2) score += 6;
  else if (sharedGamesCount === 1) score += 4;
  else score += 1;

  const candidateCommSet = new Set(candidateCommunities.map((c) => c.toString()));
  const sharedCommunity = userCommunities.some((uc) => candidateCommSet.has(uc.toString()));
  if (sharedCommunity) score += 4;

  return Math.min(10, score);
};

/**
 * Calculates complete match score (0-100) based on weighted formula:
 * - Distance: 40%
 * - Availability Overlap: 30%
 * - Skill Closeness: 20%
 * - Shared Games / Community: 10%
 */
export const scoreCandidate = (
  candidate: UserMatchCandidate,
  criteria: MatchingCriteria
): ScoredCandidate => {
  const maxRadius = criteria.maxRadiusKm || 20;
  let distanceKm = 5; // default fallback

  if (criteria.userLat !== undefined && criteria.userLng !== undefined) {
    const candidateLng = candidate.location.coordinates[0];
    const candidateLat = candidate.location.coordinates[1];
    distanceKm = calculateDistanceKm(
      criteria.userLat,
      criteria.userLng,
      candidateLat,
      candidateLng
    );
  }

  // 1. Distance score (40 points max)
  // Closer is better; beyond maxRadius drops towards 0
  const distanceRatio = Math.max(0, (maxRadius - distanceKm) / maxRadius);
  const distanceScore = Math.round(distanceRatio * 40);

  // 2. Skill closeness (20 points max)
  const candidateTargetGame = criteria.targetGameId
    ? candidate.games.find((g) => g.gameId.toString() === criteria.targetGameId)
    : candidate.games[0];
  const skillScore = computeSkillCloseness(
    criteria.targetSkill,
    candidateTargetGame?.skillLevel
  );

  // 3. Availability overlap (30 points max)
  const availabilityScore = computeAvailabilityOverlap(
    criteria.userAvailability,
    candidate.availability,
    criteria.targetDay,
    criteria.targetTimeSlot
  );

  // 4. Shared games & community (10 points max)
  const sharedGamesScore = computeSharedGamesScore(
    criteria.userGames,
    candidate.games,
    criteria.userCommunities,
    candidate.communities
  );

  const totalScore = Math.min(
    100,
    Math.max(0, distanceScore + skillScore + availabilityScore + sharedGamesScore)
  );

  return {
    player: candidate,
    distanceKm: Number(distanceKm.toFixed(1)),
    matchingScore: totalScore,
    scoreBreakdown: {
      distanceScore,
      availabilityScore,
      skillScore,
      sharedGamesScore,
    },
  };
};
