import { Router } from 'express';
import {
  createRequest,
  getRequests,
  acceptRequest,
  declineRequest,
  cancelRequest,
  completeRequest,
  getPlayHistory,
} from '../controllers/requestController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/history', getPlayHistory);
router.patch('/:id/accept', acceptRequest);
router.patch('/:id/decline', declineRequest);
router.patch('/:id/cancel', cancelRequest);
router.patch('/:id/complete', completeRequest);

export default router;
