import { Router } from 'express';
import { getGames } from '../controllers/gameController';

const router = Router();

router.get('/', getGames);

export default router;
