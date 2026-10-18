import { Router } from 'express';
import { getRealtimeStats } from '../controllers/statsController';

const router = Router();

router.get('/realtime', getRealtimeStats);

export default router;
