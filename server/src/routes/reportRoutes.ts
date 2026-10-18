import { Router } from 'express';
import { createReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createReport);

export default router;
