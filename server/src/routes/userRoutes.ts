import { Router } from 'express';
import {
  getMeProfile,
  updateProfile,
  updateGames,
  updateAvailability,
  getPublicProfile,
  toggleBlockUser,
} from '../controllers/userController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, getMeProfile);
router.put('/me', authenticate, updateProfile);
router.put('/me/games', authenticate, updateGames);
router.put('/me/availability', authenticate, updateAvailability);
router.get('/:id', optionalAuth, getPublicProfile);
router.post('/:id/block', authenticate, toggleBlockUser);

export default router;
