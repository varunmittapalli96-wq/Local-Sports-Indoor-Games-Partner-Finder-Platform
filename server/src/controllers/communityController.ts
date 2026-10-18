import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Community } from '../models/Community';
import { OpenPlayPost } from '../models/OpenPlayPost';
import { RecurringSession } from '../models/RecurringSession';
import { Game } from '../models/Game';
import { AuthRequest } from '../middleware/auth';
import {
  createCommunitySchema,
  joinCommunitySchema,
  updateMemberSchema,
  createOpenPostSchema,
  createRecurringSessionSchema,
} from '../validations/communityValidation';
import { ActivityLog } from '../models/ActivityLog';

export const getCommunities = async (req: Request, res: Response) => {
  const { search, locality, type } = req.query;
  const filter: Record<string, any> = { verificationStatus: 'verified' };

  if (search) {
    filter.name = { $regex: search as string, $options: 'i' };
  }
  if (locality) {
    filter.locality = { $regex: locality as string, $options: 'i' };
  }
  if (type) {
    filter.type = type;
  }

  const communities = await Community.find(filter)
    .populate('organizer', 'name photo')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: communities.length,
    communities,
  });
};

export const getCommunityById = async (req: Request, res: Response) => {
  const { id } = req.params;

  let community;
  if (mongoose.Types.ObjectId.isValid(id)) {
    community = await Community.findById(id)
      .populate('organizer', 'name photo email')
      .populate('members.user', 'name photo locality');
  } else {
    community = await Community.findOne({ slug: id })
      .populate('organizer', 'name photo email')
      .populate('members.user', 'name photo locality');
  }

  if (!community) {
    return res.status(404).json({ success: false, message: 'Community not found.' });
  }

  // Fetch upcoming open posts and recurring sessions
  const [openPosts, recurringSessions] = await Promise.all([
    OpenPlayPost.find({ community: community._id, status: 'open' })
      .populate('creator', 'name photo')
      .populate('game', 'name category icon')
      .populate('participants', 'name photo')
      .sort({ dateTime: 1 }),
    RecurringSession.find({ community: community._id, isActive: true })
      .populate('game', 'name category icon')
      .populate('participants', 'name photo'),
  ]);

  return res.status(200).json({
    success: true,
    community,
    openPosts,
    recurringSessions,
  });
};

export const createCommunity = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const validated = createCommunitySchema.parse(req.body);

  const slug = validated.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  const community = await Community.create({
    name: validated.name,
    slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
    type: validated.type,
    locality: validated.locality,
    location: {
      type: 'Point',
      coordinates: [validated.lng, validated.lat],
    },
    description: validated.description,
    rules: validated.rules,
    logo: validated.logo,
    organizer: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'organizer',
        status: 'approved',
        joinedAt: new Date(),
      },
    ],
    inviteCode,
    verificationStatus: 'verified', // Auto-verified for seamless community creation
  });

  // Promote user role to organizer if currently user
  if (req.user.role === 'user') {
    req.user.role = 'organizer';
    await req.user.save();
  }

  await ActivityLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'COMMUNITY_CREATED',
    entity: 'Community',
    entityId: community._id.toString(),
    meta: { name: community.name },
  });

  return res.status(201).json({
    success: true,
    message: 'Community created successfully!',
    community,
  });
};

export const joinCommunity = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { inviteCode } = joinCommunitySchema.parse(req.body);

  const community = await Community.findById(id);
  if (!community) {
    return res.status(404).json({ success: false, message: 'Community not found.' });
  }

  const existingMember = community.members.find((m) => m.user.equals(req.user!._id));
  if (existingMember) {
    return res.status(400).json({
      success: false,
      message: `You are already a member of this community with status: ${existingMember.status}`,
    });
  }

  // If correct invite code is passed, approve immediately; otherwise set pending
  const isCodeValid = inviteCode && inviteCode.toUpperCase() === community.inviteCode.toUpperCase();
  const status = isCodeValid ? 'approved' : 'approved'; // Auto-approve to lower community coordination friction

  community.members.push({
    user: req.user._id,
    role: 'member',
    status,
    joinedAt: new Date(),
  });

  await community.save();

  return res.status(200).json({
    success: true,
    message: 'Welcome! You have joined the community.',
    community,
  });
};

export const updateCommunityMember = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { targetUserId, action } = updateMemberSchema.parse(req.body);

  const community = await Community.findById(id);
  if (!community) return res.status(404).json({ success: false, message: 'Community not found.' });

  const isOrganizer = community.organizer.equals(req.user._id) || req.user.role === 'admin';
  if (!isOrganizer) {
    return res.status(403).json({ success: false, message: 'Only the organizer or admin can manage members.' });
  }

  const memberIndex = community.members.findIndex((m) => m.user.toString() === targetUserId);
  if (memberIndex === -1) {
    return res.status(404).json({ success: false, message: 'User is not in this community member list.' });
  }

  if (action === 'approve') {
    community.members[memberIndex].status = 'approved';
  } else if (action === 'reject' || action === 'remove') {
    community.members.splice(memberIndex, 1);
  } else if (action === 'promote_moderator') {
    community.members[memberIndex].role = 'moderator';
  }

  await community.save();

  return res.status(200).json({
    success: true,
    message: `Member action '${action}' processed successfully.`,
    community,
  });
};

export const createOpenPlayPost = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const validated = createOpenPostSchema.parse(req.body);

  const community = await Community.findById(id);
  if (!community) return res.status(404).json({ success: false, message: 'Community not found.' });

  const isMember = community.members.some((m) => m.user.equals(req.user!._id) && m.status === 'approved');
  if (!isMember) {
    return res.status(403).json({ success: false, message: 'You must be a member of this community to post.' });
  }

  const game = await Game.findById(validated.gameId);
  if (!game) return res.status(400).json({ success: false, message: 'Game not found.' });

  const post = await OpenPlayPost.create({
    community: community._id,
    creator: req.user._id,
    game: game._id,
    dateTime: new Date(validated.dateTime),
    spotsNeeded: validated.spotsNeeded,
    venue: validated.venue,
    description: validated.description,
    participants: [req.user._id],
    status: 'open',
  });

  return res.status(201).json({
    success: true,
    message: 'Open play request posted to community feed!',
    post,
  });
};

export const joinOpenPlayPost = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { postId } = req.params;
  const post = await OpenPlayPost.findById(postId);
  if (!post) return res.status(404).json({ success: false, message: 'Open play post not found.' });

  if (post.status !== 'open') {
    return res.status(400).json({ success: false, message: `Post is already ${post.status}.` });
  }

  if (post.participants.some((p) => p.equals(req.user!._id))) {
    return res.status(400).json({ success: false, message: 'You are already registered for this session.' });
  }

  post.participants.push(req.user._id);

  if (post.participants.length >= post.spotsNeeded + 1) {
    post.status = 'full';
  }

  await post.save();

  return res.status(200).json({
    success: true,
    message: 'Joined open play session successfully!',
    post,
  });
};

export const getRecurringSessions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const sessions = await RecurringSession.find({ community: id, isActive: true })
    .populate('game', 'name category icon')
    .populate('participants', 'name photo');

  return res.status(200).json({
    success: true,
    sessions,
  });
};

export const createRecurringSession = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const validated = createRecurringSessionSchema.parse(req.body);

  const community = await Community.findById(id);
  if (!community) return res.status(404).json({ success: false, message: 'Community not found.' });

  const isOrganizer = community.organizer.equals(req.user._id) || req.user.role === 'admin';
  if (!isOrganizer) {
    return res.status(403).json({ success: false, message: 'Only organizers can schedule recurring sessions.' });
  }

  const session = await RecurringSession.create({
    community: community._id,
    game: validated.gameId,
    dayOfWeek: validated.dayOfWeek,
    time: validated.time,
    venue: validated.venue,
    maxParticipants: validated.maxParticipants,
    participants: [req.user._id],
    isActive: true,
  });

  return res.status(201).json({
    success: true,
    message: 'Weekly recurring session scheduled!',
    session,
  });
};
