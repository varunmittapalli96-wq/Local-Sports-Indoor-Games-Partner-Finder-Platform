import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { UserGamePreference } from '../models/UserGamePreference';
import { Availability } from '../models/Availability';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validations/authValidation';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token';
import { sendEmail } from '../utils/mailer';
import { AuthRequest } from '../middleware/auth';
import { ActivityLog } from '../models/ActivityLog';

export const register = async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: validated.email.toLowerCase() });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.',
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(validated.password, salt);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const newUser = await User.create({
    name: validated.name,
    email: validated.email.toLowerCase(),
    passwordHash,
    role: 'user',
    locality: validated.locality,
    location: {
      type: 'Point',
      coordinates: [validated.lng, validated.lat],
    },
    gender: validated.gender,
    ageGroup: validated.ageGroup,
    contactPreference: validated.contactPreference,
    contactValue: validated.contactValue,
    playingLocations: validated.playingLocations,
    primaryVenue: validated.primaryVenue || '',
    womenOnlyPlay: validated.womenOnlyPlay,
    publicPlacesOnly: validated.publicPlacesOnly,
    bio: validated.bio || '',
    verificationToken,
    emailVerified: false,
  });

  // Issue Token
  const token = signToken({
    userId: newUser._id.toString(),
    role: newUser.role,
    email: newUser.email,
  });
  setAuthCookie(res, token);

  // Send verification email
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: newUser.email,
    subject: 'Welcome to PlayNear - Verify your email',
    html: `<h3>Welcome to PlayNear, ${newUser.name}!</h3>
      <p>Thank you for joining our community sports and games finder platform.</p>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>`,
  });

  await ActivityLog.create({
    actor: newUser._id,
    actorEmail: newUser.email,
    action: 'USER_REGISTERED',
    entity: 'User',
    entityId: newUser._id.toString(),
  });

  return res.status(201).json({
    success: true,
    message: 'Registration successful! Verification email sent.',
    token,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      locality: newUser.locality,
      emailVerified: newUser.emailVerified,
      womenOnlyPlay: newUser.womenOnlyPlay,
      publicPlacesOnly: newUser.publicPlacesOnly,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password credentials.',
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Your account has been suspended. Please contact platform support.',
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password credentials.',
    });
  }

  user.lastActiveAt = new Date();
  await user.save();

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
  });
  setAuthCookie(res, token);

  return res.status(200).json({
    success: true,
    message: 'Welcome back!',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      locality: user.locality,
      emailVerified: user.emailVerified,
      womenOnlyPlay: user.womenOnlyPlay,
      publicPlacesOnly: user.publicPlacesOnly,
      photo: user.photo,
    },
  });
};

export const logout = async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Verification token is required.',
    });
  }

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or already consumed verification token.',
    });
  }

  user.emailVerified = true;
  user.verificationToken = undefined;
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Email verified successfully!',
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Avoid user enumeration
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been dispatched.',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'PlayNear - Password Reset Request',
    html: `<h3>Password Reset</h3>
      <p>You requested a password reset for your PlayNear account.</p>
      <p>Click below to choose a new password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>`,
  });

  return res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a reset link has been dispatched.',
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Reset token is invalid or has expired.',
    });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Password reset successfully. You may now log in.',
  });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const [games, availability] = await Promise.all([
    UserGamePreference.find({ user: req.user._id }).populate('game'),
    Availability.find({ user: req.user._id }),
  ]);

  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      gender: req.user.gender,
      ageGroup: req.user.ageGroup,
      photo: req.user.photo,
      bio: req.user.bio,
      locality: req.user.locality,
      location: req.user.location,
      contactPreference: req.user.contactPreference,
      contactValue: req.user.contactValue,
      playingLocations: req.user.playingLocations,
      primaryVenue: req.user.primaryVenue,
      emailVerified: req.user.emailVerified,
      womenOnlyPlay: req.user.womenOnlyPlay,
      publicPlacesOnly: req.user.publicPlacesOnly,
      blockedUsers: req.user.blockedUsers,
      createdAt: req.user.createdAt,
      games,
      availability,
    },
  });
};
