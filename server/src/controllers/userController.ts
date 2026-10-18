import { Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserGamePreference } from '../models/UserGamePreference';
import { Availability } from '../models/Availability';
import { updateProfileSchema, updateGamesSchema, updateAvailabilitySchema } from '../validations/userValidation';
import { AuthRequest } from '../middleware/auth';
import { calculateDistanceKm } from '../services/matchingService';

export const getMeProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const [games, availability] = await Promise.all([
    UserGamePreference.find({ user: req.user._id }).populate('game'),
    Availability.find({ user: req.user._id }),
  ]);

  return res.status(200).json({
    success: true,
    user: {
      ...req.user.toObject(),
      games,
      availability,
    },
  });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const validated = updateProfileSchema.parse(req.body);
  const user = req.user;

  if (validated.name !== undefined) user.name = validated.name;
  if (validated.gender !== undefined) user.gender = validated.gender;
  if (validated.ageGroup !== undefined) user.ageGroup = validated.ageGroup;
  if (validated.bio !== undefined) user.bio = validated.bio;
  if (validated.locality !== undefined) user.locality = validated.locality;
  if (validated.photo !== undefined) user.photo = validated.photo;
  if (validated.contactPreference !== undefined) user.contactPreference = validated.contactPreference;
  if (validated.contactValue !== undefined) user.contactValue = validated.contactValue;
  if (validated.playingLocations !== undefined) user.playingLocations = validated.playingLocations;
  if (validated.primaryVenue !== undefined) user.primaryVenue = validated.primaryVenue;
  if (validated.womenOnlyPlay !== undefined) user.womenOnlyPlay = validated.womenOnlyPlay;
  if (validated.publicPlacesOnly !== undefined) user.publicPlacesOnly = validated.publicPlacesOnly;

  if (validated.lat !== undefined && validated.lng !== undefined) {
    user.location = {
      type: 'Point',
      coordinates: [validated.lng, validated.lat],
    };
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
};

export const updateGames = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { games } = updateGamesSchema.parse(req.body);

  // Clear existing preferences
  await UserGamePreference.deleteMany({ user: req.user._id });

  // Insert updated list
  const docs = games.map((g) => ({
    user: req.user!._id,
    game: new mongoose.Types.ObjectId(g.gameId),
    skillLevel: g.skillLevel,
  }));

  const created = await UserGamePreference.insertMany(docs);
  const populated = await UserGamePreference.find({ _id: { $in: created.map(c => c._id) } }).populate('game');

  return res.status(200).json({
    success: true,
    message: 'Game preferences updated successfully',
    games: populated,
  });
};

export const updateAvailability = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { availabilities } = updateAvailabilitySchema.parse(req.body);

  await Availability.deleteMany({ user: req.user._id });

  const docs = availabilities.map((a) => ({
    user: req.user!._id,
    dayOfWeek: a.dayOfWeek,
    slots: a.slots,
  }));

  const created = await Availability.insertMany(docs);

  return res.status(200).json({
    success: true,
    message: 'Weekly availability schedule updated successfully',
    availabilities: created,
  });
};

export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  const targetUser = await User.findById(id).select(
    'name photo ageGroup gender bio locality location playingLocations primaryVenue womenOnlyPlay publicPlacesOnly createdAt'
  );

  if (!targetUser || targetUser.status === 'suspended') {
    return res.status(404).json({ success: false, message: 'Player profile not found.' });
  }

  const [games, availability] = await Promise.all([
    UserGamePreference.find({ user: targetUser._id }).populate('game'),
    Availability.find({ user: targetUser._id }),
  ]);

  // Privacy: Fuzz location by adding subtle jitter (~200m)
  const coords = targetUser.location?.coordinates || [77.5946, 12.9716];
  const fuzzedLng = Number((coords[0] + 0.002).toFixed(4));
  const fuzzedLat = Number((coords[1] + 0.002).toFixed(4));

  // Compute distance if viewer coordinates exist
  let approximateDistance = '~2-5 km';
  if (req.user?.location?.coordinates) {
    const km = calculateDistanceKm(
      req.user.location.coordinates[1],
      req.user.location.coordinates[0],
      coords[1],
      coords[0]
    );
    approximateDistance = `~${km.toFixed(1)} km`;
  }

  return res.status(200).json({
    success: true,
    player: {
      id: targetUser._id,
      name: targetUser.name,
      photo: targetUser.photo,
      ageGroup: targetUser.ageGroup,
      gender: targetUser.gender,
      bio: targetUser.bio,
      locality: targetUser.locality,
      approximateDistance,
      fuzzedLocation: {
        lat: fuzzedLat,
        lng: fuzzedLng,
      },
      playingLocations: targetUser.playingLocations,
      primaryVenue: targetUser.primaryVenue,
      womenOnlyPlay: targetUser.womenOnlyPlay,
      publicPlacesOnly: targetUser.publicPlacesOnly,
      joinedAt: targetUser.createdAt,
      games,
      availability,
    },
  });
};

export const toggleBlockUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const targetId = new mongoose.Types.ObjectId(id);

  if (targetId.equals(req.user._id)) {
    return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
  }

  const isBlocked = req.user.blockedUsers.some((u) => u.equals(targetId));

  if (isBlocked) {
    req.user.blockedUsers = req.user.blockedUsers.filter((u) => !u.equals(targetId));
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully.',
      isBlocked: false,
    });
  } else {
    req.user.blockedUsers.push(targetId);
    await req.user.save();
    return res.status(200).json({
      success: true,
      message: 'User blocked. They will no longer appear in your search results.',
      isBlocked: true,
    });
  }
};
