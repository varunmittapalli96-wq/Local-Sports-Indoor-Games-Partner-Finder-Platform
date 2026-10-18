/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../src/app';
import { Game } from '../src/models/Game';

const app = createApp();

describe('Search & Matching API Integration Tests', () => {
  let badmintonId: string;

  beforeAll(async () => {
    const game = await Game.findOne({ name: 'Badminton' });
    if (game) {
      badmintonId = game._id.toString();
    }
  });

  it('GET /api/v1/players/search - should return ranked players in < 3000ms with matching score', async () => {
    const start = Date.now();

    const res = await request(app)
      .get('/api/v1/players/search')
      .query({
        lat: 12.9784,
        lng: 77.6408,
        radius: 20,
        page: 1,
        limit: 10,
      });

    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(elapsed).toBeLessThan(3000); // Strict requirement: < 3 seconds
    expect(res.body.players).toBeInstanceOf(Array);

    if (res.body.players.length > 0) {
      const first = res.body.players[0];
      expect(first.matchingScore).toBeGreaterThanOrEqual(0);
      expect(first.matchingScore).toBeLessThanOrEqual(100);
      expect(first.approximateDistance).toBeDefined();
      expect(first.fuzzedLocation).toBeDefined();
      expect(first.contactValue).toBeUndefined(); // Privacy check: NEVER expose contact in public search!

      // Check descending sort order
      for (let i = 1; i < res.body.players.length; i++) {
        expect(res.body.players[i - 1].matchingScore).toBeGreaterThanOrEqual(
          res.body.players[i].matchingScore
        );
      }
    }
  });

  it('GET /api/v1/players/search - should filter by game', async () => {
    if (!badmintonId) return;

    const res = await request(app)
      .get('/api/v1/players/search')
      .query({
        game: badmintonId,
        lat: 12.9784,
        lng: 77.6408,
        radius: 30,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    res.body.players.forEach((p: any) => {
      const playsBadminton = p.games.some((g: any) => g.gameId === badmintonId);
      expect(playsBadminton).toBe(true);
    });
  });

  it('GET /api/v1/players/search - should filter women-only players when requested', async () => {
    const res = await request(app)
      .get('/api/v1/players/search')
      .query({
        womenOnly: true,
        lat: 12.9784,
        lng: 77.6408,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    res.body.players.forEach((p: any) => {
      expect(p.gender).toBe('female');
    });
  });
});
