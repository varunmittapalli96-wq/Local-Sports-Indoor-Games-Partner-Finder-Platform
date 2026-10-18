/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Game } from '../src/models/Game';
import { signToken } from '../src/utils/token';

const app = createApp();

describe('Play Requests State Machine & Double-Booking Guard', () => {
  let senderUser: any;
  let receiverUser: any;
  let thirdUser: any;
  let testGame: any;
  let senderCookie: string;
  let receiverCookie: string;
  let thirdCookie: string;
  let createdRequestId: string;

  beforeAll(async () => {
    // Find or create test users
    const users = await User.find({ role: 'user' }).limit(3);
    senderUser = users[0];
    receiverUser = users[1];
    thirdUser = users[2];

    testGame = await Game.findOne();

    senderCookie = `token=${signToken({ userId: senderUser._id.toString(), role: senderUser.role, email: senderUser.email })}`;
    receiverCookie = `token=${signToken({ userId: receiverUser._id.toString(), role: receiverUser.role, email: receiverUser.email })}`;
    thirdCookie = `token=${signToken({ userId: thirdUser._id.toString(), role: thirdUser.role, email: thirdUser.email })}`;
  });

  it('POST /api/v1/requests - should create a pending play request and mask contact details', async () => {
    const sessionTime = new Date(Date.now() + 3 * 24 * 3600 * 1000); // 3 days from now

    const res = await request(app)
      .post('/api/v1/requests')
      .set('Cookie', senderCookie)
      .send({
        receiverId: receiverUser._id.toString(),
        gameId: testGame._id.toString(),
        proposedDateTime: sessionTime.toISOString(),
        durationMinutes: 60,
        locationType: 'clubhouse',
        venue: 'Club Court A',
        message: 'Friendly singles match',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.playRequest.status).toBe('pending');
    createdRequestId = res.body.playRequest._id;

    // Check that receiver sees request but contacts are masked
    const listRes = await request(app)
      .get('/api/v1/requests?box=received')
      .set('Cookie', receiverCookie);

    expect(listRes.status).toBe(200);
    const target = listRes.body.requests.find((r: any) => r._id === createdRequestId);
    expect(target).toBeDefined();
    expect(target.status).toBe('pending');
    expect(target.sender.contactValue).toBeUndefined(); // Masked before acceptance
  });

  it('PATCH /api/v1/requests/:id/accept - should accept request and unlock contact details', async () => {
    const res = await request(app)
      .patch(`/api/v1/requests/${createdRequestId}/accept`)
      .set('Cookie', receiverCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playRequest.status).toBe('accepted');

    // Verify contact value is now revealed in requests view
    const listRes = await request(app)
      .get('/api/v1/requests?box=received')
      .set('Cookie', receiverCookie);

    const target = listRes.body.requests.find((r: any) => r._id === createdRequestId);
    expect(target.sender.contactValue).toBeDefined();
  });

  it('DOUBLE-BOOKING GUARD: should reject overlapping request within 2-hour window', async () => {
    // Third user tries to schedule a session with receiverUser for nearly the same time
    const sessionTime = new Date(Date.now() + 3 * 24 * 3600 * 1000 + 30 * 60 * 1000); // 30 mins after existing session

    const createRes = await request(app)
      .post('/api/v1/requests')
      .set('Cookie', thirdCookie)
      .send({
        receiverId: receiverUser._id.toString(),
        gameId: testGame._id.toString(),
        proposedDateTime: sessionTime.toISOString(),
        locationType: 'clubhouse',
      });

    expect(createRes.status).toBe(201);
    const conflictingReqId = createRes.body.playRequest._id;

    // Receiver attempts to accept this conflicting session
    const acceptRes = await request(app)
      .patch(`/api/v1/requests/${conflictingReqId}/accept`)
      .set('Cookie', receiverCookie);

    // Must be blocked by double-booking guard with 409 Conflict
    expect(acceptRes.status).toBe(409);
    expect(acceptRes.body.success).toBe(false);
    expect(acceptRes.body.message).toContain('conflict');
  });

  it('PATCH /api/v1/requests/:id/complete - should mark session completed', async () => {
    const res = await request(app)
      .patch(`/api/v1/requests/${createdRequestId}/complete`)
      .set('Cookie', senderCookie)
      .send({
        noShowReported: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playRequest.status).toBe('completed');
  });

  it('GET /api/v1/history - should retrieve user play history', async () => {
    const res = await request(app)
      .get('/api/v1/history')
      .set('Cookie', senderCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.history).toBeInstanceOf(Array);
  });
});
