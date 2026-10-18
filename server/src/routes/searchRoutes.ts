import { Router } from 'express';
import { searchPlayers } from '../controllers/searchController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/search', optionalAuth, searchPlayers);

export default router;
