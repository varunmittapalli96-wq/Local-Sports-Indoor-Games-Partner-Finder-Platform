import { Router } from 'express';
import {
  getCommunities,
  getCommunityById,
  createCommunity,
  joinCommunity,
  updateCommunityMember,
  createOpenPlayPost,
  joinOpenPlayPost,
  getRecurringSessions,
  createRecurringSession,
} from '../controllers/communityController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getCommunities);
router.get('/:id', getCommunityById);
router.post('/', authenticate, createCommunity);
router.post('/:id/join', authenticate, joinCommunity);
router.patch('/:id/members', authenticate, updateCommunityMember);

// Open Play Posts
router.post('/:id/open-posts', authenticate, createOpenPlayPost);
router.post('/:id/open-posts/:postId/join', authenticate, joinOpenPlayPost);

// Recurring Sessions
router.get('/:id/recurring-sessions', getRecurringSessions);
router.post('/:id/recurring-sessions', authenticate, createRecurringSession);

export default router;
