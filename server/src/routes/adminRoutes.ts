import { Router } from 'express';
import {
  getAdminKpis,
  getAdminUsers,
  updateUserStatus,
  deleteUser,
  getAdminCommunities,
  verifyCommunity,
  adminManageGames,
  getAdminReports,
  updateReportStatus,
  getActivityLogs,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Protect all admin routes with authentication and role check
router.use(authenticate, authorize('admin'));

// KPIs & Analytics
router.get('/kpis', getAdminKpis);

// User Management
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Community Verification
router.get('/communities', getAdminCommunities);
router.patch('/communities/:id/verify', verifyCommunity);

// Game Categories Management
router.post('/games', adminManageGames.create);
router.put('/games/:id', adminManageGames.update);
router.delete('/games/:id', adminManageGames.delete);

// Reports Moderation
router.get('/reports', getAdminReports);
router.patch('/reports/:id', updateReportStatus);

// Activity Logs
router.get('/activity-log', getActivityLogs);

export default router;
