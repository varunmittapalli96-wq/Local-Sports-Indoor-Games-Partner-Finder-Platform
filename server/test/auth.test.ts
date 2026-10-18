/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Game } from '../src/models/Game';

const app = createApp();

describe('Auth & Profile API Integration Tests', () => {
  const testEmail = `testuser_${Date.now()}@playnear.test`;
  let authCookie: string;
  let testGameId: string;

  beforeAll(async () => {
    // Ensure at least one game exists
    let game = await Game.findOne();
    if (!game) {
      game = await Game.create({
        name: 'Test Badminton',
        category: 'indoor',
        minPlayers: 2,
        maxPlayers: 4,
      });
    }
    testGameId = game._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@playnear\.test$/ } });
  });

  it('POST /api/v1/auth/register - should register a new player successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Player',
        email: testEmail,
        password: 'Password123!',
        locality: 'Indiranagar',
        lat: 12.9784,
        lng: 77.6408,
        contactPreference: 'whatsapp',
        contactValue: '+91 99999 88888',
        ageGroup: '25-34',
        gender: 'female',
        womenOnlyPlay: false,
        publicPlacesOnly: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies[0];
  });

  it('POST /api/v1/auth/register - should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another Player',
        email: testEmail,
        password: 'Password123!',
        locality: 'Indiranagar',
        contactPreference: 'phone',
        contactValue: '1234567890',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login - should authenticate and return user info', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Test Player');
  });

  it('POST /api/v1/auth/login - should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me - should return private user profile with auth cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.contactValue).toBe('+91 99999 88888');
  });

  it('PUT /api/v1/users/me - should update profile attributes', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Cookie', authCookie)
      .send({
        bio: 'Updated bio for testing',
        womenOnlyPlay: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.bio).toBe('Updated bio for testing');
    expect(res.body.user.womenOnlyPlay).toBe(true);
  });

  it('PUT /api/v1/users/me/games - should save game preferences and skill levels', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/games')
      .set('Cookie', authCookie)
      .send({
        games: [
          { gameId: testGameId, skillLevel: 'intermediate' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.games.length).toBe(1);
    expect(res.body.games[0].skillLevel).toBe('intermediate');
  });

  it('PUT /api/v1/users/me/availability - should update weekly slots', async () => {
    const res = await request(app)
      .put('/api/v1/users/me/availability')
      .set('Cookie', authCookie)
      .send({
        availabilities: [
          {
            dayOfWeek: 'saturday',
            slots: [{ slotType: 'morning', start: '07:00', end: '09:00' }],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.availabilities.length).toBe(1);
  });

  it('POST /api/v1/auth/logout - should clear cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
