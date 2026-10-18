import { Response } from 'express';
import mongoose from 'mongoose';
import { PlayRequest, RequestStatus } from '../models/PlayRequest';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Notification } from '../models/Notification';
import { ActivityLog } from '../models/ActivityLog';
import { AuthRequest } from '../middleware/auth';
import { createRequestSchema, cancelRequestSchema, completeRequestSchema } from '../validations/requestValidation';
import { sendEmail } from '../utils/mailer';
import {
  broadcastRequestUpdate,
  broadcastNotification,
  broadcastActivity,
} from '../services/socketService';

// Auto-expiry sweep helper
export const sweepExpiredRequests = async () => {
  const now = new Date();
  await PlayRequest.updateMany(
    {
      status: 'pending',
      proposedDateTime: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const validated = createRequestSchema.parse(req.body);

  if (validated.receiverId === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot send a play request to yourself.' });
  }

  const receiver = await User.findById(validated.receiverId);
  if (!receiver || receiver.status === 'suspended') {
    return res.status(404).json({ success: false, message: 'Recipient player profile not found.' });
  }

  // Safety checks: blocked users
  if (receiver.blockedUsers?.some((id) => id.equals(req.user!._id))) {
    return res.status(403).json({ success: false, message: 'Unable to send request to this player.' });
  }

  // Women-only safety guard
  if (receiver.womenOnlyPlay && req.user.gender === 'male') {
    return res.status(403).json({
      success: false,
      message: 'This player has specified a women-only play preference.',
    });
  }

  const game = await Game.findById(validated.gameId);
  if (!game || !game.isActive) {
    return res.status(400).json({ success: false, message: 'Selected game is currently unavailable.' });
  }

  const proposedTime = new Date(validated.proposedDateTime);
  if (proposedTime <= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Proposed play session must be in the future.',
    });
  }

  // Create Request
  const playRequest = await PlayRequest.create({
    sender: req.user._id,
    receiver: receiver._id,
    game: game._id,
    proposedDateTime: proposedTime,
    durationMinutes: validated.durationMinutes,
    locationType: validated.locationType,
    venue: validated.venue,
    message: validated.message,
    status: 'pending',
  });

  // Create In-App Notification
  const notification = await Notification.create({
    user: receiver._id,
    type: 'request_received',
    title: `New Play Request for ${game.name}`,
    message: `${req.user.name} invited you to play ${game.name} on ${proposedTime.toLocaleDateString()} at ${proposedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    payload: { requestId: playRequest._id, senderId: req.user._id },
  });

  // Real-time WebSocket dispatches
  broadcastRequestUpdate(playRequest, 'created', [receiver._id.toString(), req.user._id.toString()]);
  broadcastNotification(receiver._id.toString(), notification);
  broadcastActivity({
    action: 'REQUEST_SENT',
    title: 'New Play Request',
    description: `${req.user.name} challenged ${receiver.name} for ${game.name}`,
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    meta: { game: game.name, receiver: receiver.name, sender: req.user.name },
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  // Dispath Email Notification
  await sendEmail({
    to: receiver.email,
    subject: `PlayNear: ${req.user.name} sent you a play request for ${game.name}!`,
    html: `<h3>New Play Request</h3>
      <p><strong>${req.user.name}</strong> has invited you for a game of <strong>${game.name}</strong>.</p>
      <p><strong>Date & Time:</strong> ${proposedTime.toLocaleString()}</p>
      <p><strong>Location:</strong> ${validated.locationType} ${validated.venue ? `(${validated.venue})` : ''}</p>
      <p><strong>Message:</strong> "${validated.message || 'Looking forward to a great game!'}"</p>
      <p><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/requests">Log in to PlayNear to Accept or Decline</a></p>`,
  });

  await ActivityLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'REQUEST_SENT',
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    meta: { game: game.name, receiver: receiver.name },
  });

  return res.status(201).json({
    success: true,
    message: 'Play request sent successfully!',
    playRequest,
  });
};

export const getRequests = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  await sweepExpiredRequests();

  const { box, status } = req.query;
  const filter: Record<string, any> = {};

  if (box === 'sent') {
    filter.sender = req.user._id;
  } else if (box === 'received') {
    filter.receiver = req.user._id;
  } else {
    filter.$or = [{ sender: req.user._id }, { receiver: req.user._id }];
  }

  if (status) {
    filter.status = status;
  }

  const requests = await PlayRequest.find(filter)
    .populate('sender', 'name photo locality contactPreference contactValue')
    .populate('receiver', 'name photo locality contactPreference contactValue')
    .populate('game', 'name category icon')
    .sort({ proposedDateTime: -1 })
    .lean();

  // Privacy Protection: Mask contactValue unless request status is accepted or completed
  const sanitized = requests.map((r: any) => {
    const isAcceptedOrCompleted = r.status === 'accepted' || r.status === 'completed';
    const isSender = req.user!._id.equals(r.sender._id);

    return {
      ...r,
      sender: {
        _id: r.sender._id,
        name: r.sender.name,
        photo: r.sender.photo,
        locality: r.sender.locality,
        contactPreference: r.sender.contactPreference,
        // Reveal only if accepted/completed
        contactValue: isAcceptedOrCompleted ? r.sender.contactValue : undefined,
      },
      receiver: {
        _id: r.receiver._id,
        name: r.receiver.name,
        photo: r.receiver.photo,
        locality: r.receiver.locality,
        contactPreference: r.receiver.contactPreference,
        // Reveal only if accepted/completed
        contactValue: isAcceptedOrCompleted ? r.receiver.contactValue : undefined,
      },
      userRoleInRequest: isSender ? 'sender' : 'receiver',
    };
  });

  return res.status(200).json({
    success: true,
    count: sanitized.length,
    requests: sanitized,
  });
};

export const acceptRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const playRequest = await PlayRequest.findById(id).populate('sender receiver game');

  if (!playRequest) {
    return res.status(404).json({ success: false, message: 'Play request not found.' });
  }

  // Only recipient can accept
  if (!playRequest.receiver._id.equals(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the recipient can accept this play request.' });
  }

  if (playRequest.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot accept request with status: ${playRequest.status}`,
    });
  }

  // Check if session time has already passed
  if (playRequest.proposedDateTime <= new Date()) {
    playRequest.status = 'expired';
    await playRequest.save();
    return res.status(400).json({
      success: false,
      message: 'This play request has expired because the proposed time has already passed.',
    });
  }

  // Double-booking Guard:
  // Check if receiver OR sender already has another accepted session within a 2-hour window
  const windowStart = new Date(playRequest.proposedDateTime.getTime() - 2 * 3600 * 1000);
  const windowEnd = new Date(playRequest.proposedDateTime.getTime() + 2 * 3600 * 1000);

  const conflict = await PlayRequest.findOne({
    _id: { $ne: playRequest._id },
    status: 'accepted',
    proposedDateTime: { $gte: windowStart, $lte: windowEnd },
    $or: [
      { sender: playRequest.receiver._id },
      { receiver: playRequest.receiver._id },
      { sender: playRequest.sender._id },
      { receiver: playRequest.sender._id },
    ],
  });

  if (conflict) {
    return res.status(409).json({
      success: false,
      message: 'Schedule conflict: An overlapping session is already accepted within this time window.',
    });
  }

  playRequest.status = 'accepted';
  playRequest.respondedAt = new Date();
  await playRequest.save();

  // Send Notification & Email to Sender
  const senderUser = playRequest.sender as any;
  const receiverUser = playRequest.receiver as any;
  const game = playRequest.game as any;

  const notification = await Notification.create({
    user: senderUser._id,
    type: 'request_accepted',
    title: `Play Request Accepted!`,
    message: `${receiverUser.name} accepted your request to play ${game.name} on ${playRequest.proposedDateTime.toLocaleDateString()}. Contact info unlocked!`,
    payload: { requestId: playRequest._id },
  });

  // Real-time WebSocket dispatches
  broadcastRequestUpdate(playRequest, 'accepted', [senderUser._id.toString(), receiverUser._id.toString()]);
  broadcastNotification(senderUser._id.toString(), notification);
  broadcastActivity({
    action: 'REQUEST_ACCEPTED',
    title: 'Play Match Confirmed!',
    description: `${receiverUser.name} & ${senderUser.name} confirmed a game of ${game.name}`,
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    meta: { game: game.name, sender: senderUser.name, receiver: receiverUser.name },
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  await sendEmail({
    to: senderUser.email,
    subject: `PlayNear: ${receiverUser.name} accepted your game!`,
    html: `<h3>Game On!</h3>
      <p><strong>${receiverUser.name}</strong> has accepted your request to play <strong>${game.name}</strong>.</p>
      <p><strong>Contact Info:</strong> ${receiverUser.contactPreference.toUpperCase()}: ${receiverUser.contactValue}</p>
      <p>Coordinate details with your partner and enjoy your game!</p>`,
  });

  await ActivityLog.create({
    actor: req.user._id,
    actorEmail: req.user.email,
    action: 'REQUEST_ACCEPTED',
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
  });

  return res.status(200).json({
    success: true,
    message: 'Play request accepted! Contact details are now unlocked.',
    playRequest,
  });
};

export const declineRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const playRequest = await PlayRequest.findById(id).populate('sender game');

  if (!playRequest) {
    return res.status(404).json({ success: false, message: 'Play request not found.' });
  }

  if (!playRequest.receiver.equals(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Only the recipient can decline this play request.' });
  }

  if (playRequest.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Cannot decline request with status: ${playRequest.status}`,
    });
  }

  playRequest.status = 'declined';
  playRequest.respondedAt = new Date();
  await playRequest.save();

  const senderUser = playRequest.sender as any;
  const game = playRequest.game as any;

  const notification = await Notification.create({
    user: senderUser._id,
    type: 'request_declined',
    title: `Play Request Update`,
    message: `${req.user.name} was unable to accept your request for ${game.name}. Try finding another partner nearby!`,
    payload: { requestId: playRequest._id },
  });

  // Real-time WebSocket dispatches
  broadcastRequestUpdate(playRequest, 'declined', [senderUser._id.toString(), req.user._id.toString()]);
  broadcastNotification(senderUser._id.toString(), notification);
  broadcastActivity({
    action: 'REQUEST_DECLINED',
    title: 'Play Request Declined',
    description: `${req.user.name} declined request for ${game.name}`,
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  return res.status(200).json({
    success: true,
    message: 'Play request declined.',
    playRequest,
  });
};

export const cancelRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { reason } = cancelRequestSchema.parse(req.body);

  const playRequest = await PlayRequest.findById(id).populate('sender receiver game');
  if (!playRequest) {
    return res.status(404).json({ success: false, message: 'Play request not found.' });
  }

  const isSender = playRequest.sender._id.equals(req.user._id);
  const isReceiver = playRequest.receiver._id.equals(req.user._id);

  if (!isSender && !isReceiver) {
    return res.status(403).json({ success: false, message: 'You are not a participant in this request.' });
  }

  if (playRequest.status !== 'pending' && playRequest.status !== 'accepted') {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a request with status: ${playRequest.status}`,
    });
  }

  playRequest.status = 'cancelled';
  playRequest.cancellationReason = reason || 'Cancelled by participant';
  await playRequest.save();

  const partnerId = isSender ? playRequest.receiver._id : playRequest.sender._id;
  const game = playRequest.game as any;

  const notification = await Notification.create({
    user: partnerId,
    type: 'request_cancelled',
    title: `Session Cancelled`,
    message: `${req.user.name} cancelled the ${game.name} session scheduled for ${playRequest.proposedDateTime.toLocaleDateString()}. Reason: ${reason || 'Schedule change'}`,
    payload: { requestId: playRequest._id },
  });

  // Real-time WebSocket dispatches
  broadcastRequestUpdate(playRequest, 'cancelled', [partnerId.toString(), req.user._id.toString()]);
  broadcastNotification(partnerId.toString(), notification);
  broadcastActivity({
    action: 'REQUEST_CANCELLED',
    title: 'Play Session Cancelled',
    description: `${req.user.name} cancelled the ${game.name} meetup`,
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  return res.status(200).json({
    success: true,
    message: 'Play session cancelled.',
    playRequest,
  });
};

export const completeRequest = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id } = req.params;
  const { noShowReported, noShowReason } = completeRequestSchema.parse(req.body);

  const playRequest = await PlayRequest.findById(id).populate('sender receiver game');
  if (!playRequest) {
    return res.status(404).json({ success: false, message: 'Play request not found.' });
  }

  const isSender = playRequest.sender._id.equals(req.user._id);
  const isReceiver = playRequest.receiver._id.equals(req.user._id);

  if (!isSender && !isReceiver) {
    return res.status(403).json({ success: false, message: 'You are not a participant in this request.' });
  }

  if (playRequest.status !== 'accepted') {
    return res.status(400).json({
      success: false,
      message: `Only accepted sessions can be marked completed. Current status: ${playRequest.status}`,
    });
  }

  playRequest.status = 'completed';
  playRequest.completedAt = new Date();

  if (noShowReported && noShowReason) {
    playRequest.noShowFlags.push({
      reportedBy: req.user._id,
      reason: noShowReason,
      reportedAt: new Date(),
    });
  }

  await playRequest.save();

  // Real-time WebSocket dispatches
  broadcastRequestUpdate(playRequest, 'completed', [playRequest.sender._id.toString(), playRequest.receiver._id.toString()]);
  broadcastActivity({
    action: 'SESSION_COMPLETED',
    title: 'Play Session Completed! 🏆',
    description: `Match finished for ${(playRequest.game as any)?.name || 'Game'} between ${(playRequest.sender as any)?.name} & ${(playRequest.receiver as any)?.name}`,
    entity: 'PlayRequest',
    entityId: playRequest._id.toString(),
    meta: { noShowReported },
    actorId: req.user._id.toString(),
    actorEmail: req.user.email,
  });

  return res.status(200).json({
    success: true,
    message: 'Session recorded as completed! Thank you for playing.',
    playRequest,
  });
};

export const getPlayHistory = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  await sweepExpiredRequests();

  const { timeframe } = req.query; // 'upcoming' | 'past'
  const now = new Date();

  const filter: Record<string, any> = {
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
  };

  if (timeframe === 'upcoming') {
    filter.proposedDateTime = { $gte: now };
    filter.status = { $in: ['accepted', 'pending'] };
  } else if (timeframe === 'past') {
    filter.$or = [
      { proposedDateTime: { $lt: now } },
      { status: { $in: ['completed', 'cancelled', 'declined', 'expired'] } },
    ];
    filter.$and = [{ $or: [{ sender: req.user._id }, { receiver: req.user._id }] }];
  }

  const history = await PlayRequest.find(filter)
    .populate('sender', 'name photo locality contactPreference contactValue')
    .populate('receiver', 'name photo locality contactPreference contactValue')
    .populate('game', 'name category icon')
    .sort({ proposedDateTime: timeframe === 'upcoming' ? 1 : -1 })
    .lean();

  const sanitized = history.map((r: any) => {
    const isAcceptedOrCompleted = r.status === 'accepted' || r.status === 'completed';
    return {
      ...r,
      sender: {
        _id: r.sender._id,
        name: r.sender.name,
        photo: r.sender.photo,
        locality: r.sender.locality,
        contactValue: isAcceptedOrCompleted ? r.sender.contactValue : undefined,
      },
      receiver: {
        _id: r.receiver._id,
        name: r.receiver.name,
        photo: r.receiver.photo,
        locality: r.receiver.locality,
        contactValue: isAcceptedOrCompleted ? r.receiver.contactValue : undefined,
      },
    };
  });

  return res.status(200).json({
    success: true,
    count: sanitized.length,
    history: sanitized,
  });
};
