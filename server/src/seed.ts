import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import readline from 'readline';
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/User';
import { Game } from './models/Game';
import { UserGamePreference } from './models/UserGamePreference';
import { Availability } from './models/Availability';
import { Community } from './models/Community';
import { PlayRequest } from './models/PlayRequest';
import { OpenPlayPost } from './models/OpenPlayPost';
import { RecurringSession } from './models/RecurringSession';
import { ActivityLog } from './models/ActivityLog';

const confirmExecution = async (): Promise<boolean> => {
  if (process.env.CONFIRM_SEED === 'true' || process.env.FORCE_SEED === 'yes') {
    return true;
  }

  const uri = process.env.MONGODB_URI || 'local database';
  const sanitizedUri = uri.replace(/\/\/.*@/, '//<credentials>@');

  if (!process.stdin.isTTY) {
    console.error('');
    console.error('================================================================================');
    console.error('⚠️  AUTOMATED SEED ABORTED');
    console.error('================================================================================');
    console.error(`Target database: ${sanitizedUri}`);
    console.error('Seeding is destructive and deletes existing records.');
    console.error('To proceed in automated/CI environments, explicitly pass: CONFIRM_SEED=true');
    console.error('================================================================================');
    console.error('');
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  WARNING: Running seed will clear collections and populate with demo data at:\n   ${sanitizedUri}\n\nAre you sure you want to proceed? (yes/N): `,
      (answer) => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    );
  });
};

export const seedDatabase = async () => {
  console.log('--- Starting PlayNear Database Seed ---');
  await connectDB();

  // Clear existing collections
  console.log('[Seed] Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Game.deleteMany({}),
    UserGamePreference.deleteMany({}),
    Availability.deleteMany({}),
    Community.deleteMany({}),
    PlayRequest.deleteMany({}),
    OpenPlayPost.deleteMany({}),
    RecurringSession.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  const defaultPasswordHash = await bcrypt.hash('UserPass123!', 10);
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@playnear.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const orgPasswordHash = await bcrypt.hash('OrgPass123!', 10);

  // 1. Seed 10 Games (Indoor & Outdoor)
  console.log('[Seed] Creating 10 Games...');
  const gamesData = [
    { name: 'Badminton', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'badminton', description: 'Fast-paced racquet sport for singles or doubles' },
    { name: 'Table Tennis', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'table-tennis', description: 'Quick reflexes and ping pong rallies' },
    { name: 'Chess', category: 'indoor' as const, minPlayers: 2, maxPlayers: 2, icon: 'chess', description: 'Strategic board game for analytical minds' },
    { name: 'Carrom', category: 'indoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'circle-dot', description: 'Traditional strike-and-pocket tabletop game' },
    { name: 'Cards & Board Games', category: 'indoor' as const, minPlayers: 2, maxPlayers: 8, icon: 'spade', description: 'Casual card games, Catan, Scrabble and more' },
    { name: 'Cricket (Box / Turf)', category: 'outdoor' as const, minPlayers: 6, maxPlayers: 14, icon: 'shield', description: 'Gully cricket, box turf matches and nets' },
    { name: 'Football (Turf / Field)', category: 'outdoor' as const, minPlayers: 4, maxPlayers: 12, icon: 'circle', description: '5-a-side, 7-a-side and pickup soccer' },
    { name: 'Tennis', category: 'outdoor' as const, minPlayers: 2, maxPlayers: 4, icon: 'target', description: 'Lawn tennis singles and doubles on hard/clay courts' },
    { name: 'Squash', category: 'indoor' as const, minPlayers: 2, maxPlayers: 2, icon: 'box', description: 'High-energy indoor wall-ball racquet sport' },
    { name: 'Basketball', category: 'outdoor' as const, minPlayers: 2, maxPlayers: 10, icon: 'dribbble', description: 'Half-court 3v3 or full-court 5v5 pickup hoops' },
  ];
  const games = await Game.insertMany(gamesData);
  const gameMap = new Map(games.map(g => [g.name, g._id]));

  // 2. Localities and base coordinates (Bangalore hub)
  const localities = [
    { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
    { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
    { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
  ];

  // Helper for small jitter (~200m - 1km)
  const jitterCoord = (base: number) => base + (Math.random() - 0.5) * 0.015;

  // 3. Create Admin Account
  console.log(`[Seed] Creating Admin Account (${adminEmail})...`);
  const adminUser = await User.create({
    name: 'PlayNear Admin',
    email: adminEmail,
    passwordHash: adminPasswordHash,
    role: 'admin',
    gender: 'prefer-not-to-say',
    ageGroup: '25-34',
    locality: 'Indiranagar',
    location: { type: 'Point', coordinates: [77.6408, 12.9784] },
    contactPreference: 'email',
    contactValue: adminEmail,
    playingLocations: ['clubhouse', 'ground'],
    primaryVenue: 'Indiranagar Club',
    emailVerified: true,
    status: 'active',
    bio: 'Platform Administrator and community recreation advocate.',
  });

  // 4. Create Community Organizer Account
  console.log('[Seed] Creating Organizer Account...');
  const orgUser = await User.create({
    name: 'Rajesh Sharma',
    email: 'organizer@playnear.com',
    passwordHash: orgPasswordHash,
    role: 'organizer',
    gender: 'male',
    ageGroup: '35-44',
    locality: 'Koramangala',
    location: { type: 'Point', coordinates: [77.6245, 12.9352] },
    contactPreference: 'whatsapp',
    contactValue: '+91 98765 43210',
    playingLocations: ['clubhouse', 'ground'],
    primaryVenue: 'Koramangala Club & Turf',
    emailVerified: true,
    status: 'active',
    bio: 'Society Sports Secretary & Badminton/Cricket enthusiast.',
  });

  // 5. Create 30 Demo Users across 3 localities
  console.log('[Seed] Creating 30 Demo Users...');
  const firstNames = [
    'Aarav', 'Ananya', 'Rohan', 'Pooja', 'Vikram', 'Sneha', 'Arjun', 'Meera',
    'Karthik', 'Divya', 'Siddharth', 'Aditi', 'Nikhil', 'Tanvi', 'Rahul', 'Isha',
    'Varun', 'Kavya', 'Gaurav', 'Rhea', 'Abhishek', 'Shreya', 'Pranav', 'Nandini',
    'Deepak', 'Sonia', 'Tarun', 'Priyanka', 'Aditya', 'Ritu'
  ];
  const lastNames = [
    'Patel', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Verma', 'Menon', 'Gupta',
    'Bhat', 'Deshmukh', 'Kulkarni', 'Joshi', 'Mehta', 'Chopra', 'Kapoor'
  ];

  const demoUsers = [];
  for (let i = 0; i < 30; i++) {
    const loc = localities[i % localities.length];
    const isFemale = i % 2 === 1;
    const gender = isFemale ? 'female' : 'male';
    const fName = firstNames[i];
    const lName = lastNames[i % lastNames.length];
    const name = `${fName} ${lName}`;
    const email = `user${i + 1}@playnear.com`;
    const womenOnly = isFemale && (i % 3 === 0);
    const publicOnly = i % 4 === 0;
    const ageGroups: Array<'18-24' | '25-34' | '35-44' | '45-54'> = ['18-24', '25-34', '35-44', '45-54'];
    const ageGroup = ageGroups[i % ageGroups.length];

    demoUsers.push({
      name,
      email,
      passwordHash: defaultPasswordHash,
      role: 'user' as const,
      gender: gender as any,
      ageGroup,
      photo: `https://images.unsplash.com/photo-${1534528741775 + i}?auto=format&fit=crop&w=150&q=80`,
      bio: `Enthusiastic recreational player in ${loc.name}. Looking for friendly weekend and evening games!`,
      locality: loc.name,
      location: {
        type: 'Point' as const,
        coordinates: [jitterCoord(loc.lng), jitterCoord(loc.lat)] as [number, number],
      },
      contactPreference: (['whatsapp', 'phone', 'email'][i % 3]) as any,
      contactValue: `+91 98${Math.floor(10000000 + Math.random() * 89999999)}`,
      playingLocations: (i % 2 === 0 ? ['clubhouse', 'ground'] : ['home', 'clubhouse']) as any,
      primaryVenue: `${loc.name} Community Hall / Ground`,
      emailVerified: true,
      status: 'active' as const,
      womenOnlyPlay: womenOnly,
      publicPlacesOnly: publicOnly,
      lastActiveAt: new Date(Date.now() - (i * 3600 * 1000 * 3)),
    });
  }

  const createdUsers = await User.insertMany(demoUsers);
  const allPlayUsers = [orgUser, ...createdUsers];

  // 6. Seed User Game Preferences and Availability
  console.log('[Seed] Seeding Game Preferences and Availabilities...');
  const skillLevels: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];
  const days: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const prefsData = [];
  const availData = [];

  for (const user of allPlayUsers) {
    // Pick 2-4 random games
    const numGames = 2 + (Math.floor(Math.random() * 3));
    const shuffledGames = [...games].sort(() => 0.5 - Math.random()).slice(0, numGames);

    for (const g of shuffledGames) {
      prefsData.push({
        user: user._id,
        game: g._id,
        skillLevel: skillLevels[Math.floor(Math.random() * skillLevels.length)],
      });
    }

    // Set 3-5 days availability
    const userDays = days.filter(() => Math.random() > 0.4);
    if (userDays.length === 0) userDays.push('saturday', 'sunday');

    for (const day of userDays) {
      availData.push({
        user: user._id,
        dayOfWeek: day,
        slots: [
          { slotType: 'morning', start: '06:30', end: '08:30' },
          { slotType: 'evening', start: '18:00', end: '20:30' },
        ],
      });
    }
  }

  await UserGamePreference.insertMany(prefsData);
  await Availability.insertMany(availData);

  // 7. Seed 3 Communities
  console.log('[Seed] Creating 3 Communities...');
  const community1 = await Community.create({
    name: 'Prestige Palms Sports Club',
    slug: 'prestige-palms-sports',
    type: 'society',
    locality: 'Koramangala',
    location: { type: 'Point', coordinates: [77.6245, 12.9352] },
    description: 'A vibrant apartment club featuring indoor badminton courts, squash court, and chess club.',
    rules: 'Proper non-marking shoes required on badminton court. Arrive 5 mins prior to slot.',
    logo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=200&q=80',
    organizer: orgUser._id,
    members: [
      { user: orgUser._id as any, role: 'organizer', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[0]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[1]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[2]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
    ],
    inviteCode: 'PRESTIGE2026',
    verificationStatus: 'verified',
  });

  const community2 = await Community.create({
    name: 'Indiranagar Smashers & Racquet Guild',
    slug: 'indiranagar-smashers',
    type: 'club',
    locality: 'Indiranagar',
    location: { type: 'Point', coordinates: [77.6408, 12.9784] },
    description: 'Casual and intermediate players meeting for badminton, table tennis, and weekend lawn tennis.',
    rules: 'Friendly rallies only, no competitive hostility. All skill levels welcome.',
    logo: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=200&q=80',
    organizer: createdUsers[3]._id as any,
    members: [
      { user: createdUsers[3]._id as any, role: 'organizer', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[4]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[5]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
    ],
    inviteCode: 'INDYSMASH',
    verificationStatus: 'verified',
  });

  const community3 = await Community.create({
    name: 'HSR Weekend Board & Outdoor League',
    slug: 'hsr-weekend-league',
    type: 'neighborhood',
    locality: 'HSR Layout',
    location: { type: 'Point', coordinates: [77.6446, 12.9121] },
    description: 'Chess, Carrom, Catan, and morning turf box cricket for residents across HSR Sectors.',
    rules: 'Open for all age groups. Bring your friendly game spirit.',
    logo: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=200&q=80',
    organizer: createdUsers[6]._id as any,
    members: [
      { user: createdUsers[6]._id as any, role: 'organizer', status: 'approved', joinedAt: new Date() },
      { user: createdUsers[7]._id as any, role: 'member', status: 'approved', joinedAt: new Date() },
    ],
    inviteCode: 'HSRPLAY',
    verificationStatus: 'pending',
  });

  // 8. Seed Open Play Posts & Recurring Sessions
  console.log('[Seed] Seeding Open Play Posts & Recurring Sessions...');
  const badmintonGame = games.find(g => g.name === 'Badminton') || games[0];
  const chessGame = games.find(g => g.name === 'Chess') || games[2];
  const cricketGame = games.find(g => g.name.includes('Cricket')) || games[5];

  await OpenPlayPost.create({
    community: community1._id,
    creator: orgUser._id,
    game: badmintonGame._id,
    dateTime: new Date(Date.now() + 24 * 3600 * 1000), // tomorrow
    spotsNeeded: 2,
    venue: 'Prestige Palms Clubhouse Court 1',
    description: 'Need 2 more players for intermediate doubles badminton tomorrow evening!',
    participants: [orgUser._id, createdUsers[0]._id],
    status: 'open',
  });

  await OpenPlayPost.create({
    community: community2._id,
    creator: createdUsers[3]._id,
    game: badmintonGame._id,
    dateTime: new Date(Date.now() + 48 * 3600 * 1000),
    spotsNeeded: 1,
    venue: 'Indiranagar Club Badminton Hall',
    description: 'Singles practice, 1 player needed.',
    participants: [createdUsers[3]._id],
    status: 'open',
  });

  await RecurringSession.create({
    community: community1._id,
    game: chessGame._id,
    dayOfWeek: 'saturday',
    time: '17:00',
    venue: 'Clubhouse Lounge',
    maxParticipants: 8,
    participants: [orgUser._id, createdUsers[1]._id, createdUsers[2]._id],
    isActive: true,
  });

  await RecurringSession.create({
    community: community3._id,
    game: cricketGame._id,
    dayOfWeek: 'sunday',
    time: '07:00',
    venue: 'HSR Sector 2 Turf',
    maxParticipants: 14,
    participants: [createdUsers[6]._id, createdUsers[7]._id],
    isActive: true,
  });

  // 9. Seed Sample Play Requests (pending, accepted, completed, declined)
  console.log('[Seed] Seeding Sample Play Requests...');
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const nextWeek = new Date(Date.now() + 4 * 24 * 3600 * 1000);
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);

  await PlayRequest.create([
    {
      sender: createdUsers[0]._id,
      receiver: createdUsers[1]._id,
      game: badmintonGame._id,
      proposedDateTime: tomorrow,
      durationMinutes: 60,
      locationType: 'clubhouse',
      venue: 'Koramangala Club Court A',
      message: 'Hey! Would love to play a couple of badminton sets tomorrow evening.',
      status: 'pending',
    },
    {
      sender: createdUsers[2]._id,
      receiver: orgUser._id,
      game: badmintonGame._id,
      proposedDateTime: nextWeek,
      durationMinutes: 90,
      locationType: 'clubhouse',
      venue: 'Prestige Palms Court 2',
      message: 'Hi Rajesh! Count me in for doubles next week.',
      status: 'accepted',
      respondedAt: new Date(),
    },
    {
      sender: createdUsers[4]._id,
      receiver: createdUsers[5]._id,
      game: chessGame._id,
      proposedDateTime: yesterday,
      durationMinutes: 60,
      locationType: 'home',
      venue: '12th Main Indiranagar',
      message: 'Rapid chess match over tea?',
      status: 'completed',
      respondedAt: twoDaysAgo,
      completedAt: yesterday,
    },
    {
      sender: createdUsers[6]._id,
      receiver: createdUsers[7]._id,
      game: cricketGame._id,
      proposedDateTime: twoDaysAgo,
      durationMinutes: 120,
      locationType: 'ground',
      venue: 'HSR BDA Ground',
      message: 'Cricket practice',
      status: 'declined',
      respondedAt: twoDaysAgo,
    },
  ]);

  // 10. Seed Initial Activity Logs
  await ActivityLog.create([
    {
      actor: adminUser._id,
      actorEmail: adminUser.email,
      action: 'SYSTEM_INITIALIZED',
      entity: 'Platform',
      meta: { message: 'PlayNear platform seeded with initial games, users, and communities' },
    },
    {
      actor: orgUser._id,
      actorEmail: orgUser.email,
      action: 'COMMUNITY_CREATED',
      entity: 'Community',
      entityId: community1._id.toString(),
      meta: { communityName: community1.name },
    },
  ]);

  console.log('--- PlayNear Database Seed Completed Successfully ---');
  console.log('Credentials:');
  console.log(`  Admin:     ${adminEmail} / ${process.env.ADMIN_PASSWORD ? '******** (configured via ADMIN_PASSWORD)' : 'AdminPass123!'}`);
  console.log('  Organizer: organizer@playnear.com / OrgPass123!');
  console.log('  User:      user1@playnear.com / UserPass123! (up to user30@playnear.com)');
  console.log('----------------------------------------------------');
};

// If run directly via CLI
if (require.main === module) {
  (async () => {
    const proceed = await confirmExecution();
    if (!proceed) {
      console.log('[Seed] Database seed cancelled. No changes were made.');
      process.exit(0);
    }
    try {
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed Error]:', err);
      await disconnectDB();
      process.exit(1);
    }
  })();
}
