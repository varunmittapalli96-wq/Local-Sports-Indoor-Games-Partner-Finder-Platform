import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swaggerSpec';
import { mongoSanitize } from './middleware/sanitize';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { getPlayHistory } from './controllers/requestController';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import gameRoutes from './routes/gameRoutes';
import searchRoutes from './routes/searchRoutes';
import requestRoutes from './routes/requestRoutes';
import communityRoutes from './routes/communityRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import adminRoutes from './routes/adminRoutes';
import statsRoutes from './routes/statsRoutes';

export const createApp = () => {
  const app = express();

  // Trust reverse proxy for secure cookies and accurate rate limiting behind Render/Cloudflare
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI and Leaflet tiles
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration: flexible whitelist based on CLIENT_URL + localhost + cloud platforms
  const clientUrlEnv = process.env.CLIENT_URL || '';
  const allowedOrigins = clientUrlEnv
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const isAllowedOrigin = (origin: string): boolean => {
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized)) return true;
    // Allow localhost and loopback (any port) for seamless local dev & testing
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;
    // Allow Render or Vercel preview/production deployments
    if (/\.onrender\.com$/.test(normalized) || /\.vercel\.app$/.test(normalized)) return true;
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, uptime monitors)
        if (!origin || isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    })
  );

  // Body Parsing & Cookies
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Input Sanitization against NoSQL injection
  app.use(mongoSanitize);

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  });
  app.use('/api/', generalLimiter);

  // Auth Limiter
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many authentication attempts, please wait 15 minutes.' },
  });
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PlayNear API Documentation',
  }));

  // Render & Cloud Health Check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Backward-compatible Health Check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'PlayNear API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // REST API Routes (/api/v1)
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/games', gameRoutes);
  apiRouter.use('/players', searchRoutes);
  apiRouter.use('/requests', requestRoutes);
  apiRouter.use('/history', authenticate, getPlayHistory);
  apiRouter.use('/communities', communityRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/reports', reportRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/stats', statsRoutes);

  app.use('/api/v1', apiRouter);

  // 404 & Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
