import { Request, Response } from 'express';
import { Game, ensureDefaultGames } from '../models/Game';

export const getGames = async (req: Request, res: Response) => {
  const { category } = req.query;

  const filter: Record<string, any> = { isActive: true };
  if (category && (category === 'indoor' || category === 'outdoor')) {
    filter.category = category;
  }

  let games = await Game.find(filter).sort({ name: 1 });
  if (games.length === 0) {
    await ensureDefaultGames();
    games = await Game.find(filter).sort({ name: 1 });
  }

  return res.status(200).json({
    success: true,
    count: games.length,
    games,
  });
};
