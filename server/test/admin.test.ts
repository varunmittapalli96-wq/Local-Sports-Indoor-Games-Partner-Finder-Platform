/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { signToken } from '../src/utils/token';

const app = createApp();

describe('Admin Module API Integration Tests', () => {
  let adminCookie: string;
  let regularUserCookie: string;
  let testUserId: string;

  beforeAll(async () => {
    const admin = await User.findOne({ role: 'admin' });
    const user = await User.findOne({ role: 'user' });

    if (admin) {
      adminCookie = `token=${signToken({ userId: admin._id.toString(), role: 'admin', email: admin.email })}`;
    }
    if (user) {
      testUserId = user._id.toString();
      regularUserCookie = `token=${signToken({ userId: user._id.toString(), role: 'user', email: user.email })}`;
    }
  });

  it('GET /api/v1/admin/kpis - should block non-admin users with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/kpis')
      .set('Cookie', regularUserCookie);

    expect(res.status).toBe(403);
  });

  it('GET /api/v1/admin/kpis - should return all core platform KPIs for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/kpis')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { kpis, charts } = res.body;
    expect(kpis.registeredUsers).toBeGreaterThan(0);
    expect(kpis.monthlyActiveUsers).toBeGreaterThanOrEqual(0);
    expect(kpis.successfulMatchRate).toBeGreaterThanOrEqual(0);
    expect(kpis.repeatEngagementRate).toBeGreaterThanOrEqual(0);

    expect(charts.gameDistribution).toBeInstanceOf(Array);
    expect(charts.localityDistribution).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/users - should list users with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=5')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users.length).toBeLessThanOrEqual(5);
  });

  it('PATCH /api/v1/admin/users/:id/status - should suspend and reactivate a user', async () => {
    if (!testUserId) return;

    // Suspend
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${testUserId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'suspended' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.user.status).toBe('suspended');

    // Reactivate
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${testUserId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'active' });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.user.status).toBe('active');
  });

  it('GET /api/v1/admin/activity-log - should return platform audit log', async () => {
    const res = await request(app)
      .get('/api/v1/admin/activity-log')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toBeInstanceOf(Array);
  });
});
