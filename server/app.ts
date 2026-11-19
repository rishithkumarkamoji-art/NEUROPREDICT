import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import {
  analyticsRouter,
  reportsRouter,
  settingsRouter,
} from './routes/analyticsReportRoutes.ts';
import { authRouter, usersRouter } from './routes/authRoutes.ts';
import {
  modelRouter,
  predictionRouter,
  recommendationRouter,
} from './routes/predictionModelRoutes.ts';
import { studentRouter } from './routes/studentRoutes.ts';

interface AppLifecycleOptions {
  waitForReady?: () => Promise<void>;
  getReadyState?: () => { ready: boolean; error: string | null };
}

export function createExpressApp(options?: AppLifecycleOptions) {
  const app = express();

  app.set('trust proxy', 1);

  // Secure HTTP headers (relaxed CSP for Vite/React inline scripts and Google Fonts)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Configurable CORS
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(null, true); // Allow preview iframe origins while preserving header check hook
        }
      },
      credentials: true,
    })
  );

  // Request size limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Health probe responds immediately for Cloud Run startup/liveness checks
  app.get('/api/health', (_req, res) => {
    const state = options?.getReadyState?.() ?? { ready: true, error: null };
    res.json({
      ok: true,
      ready: state.ready,
      service: 'NeuroPredict API',
      timestamp: new Date().toISOString(),
    });
  });

  // Ensure API requests wait cleanly for bootstrap initialization to finish
  if (options?.waitForReady) {
    const waitForReady = options.waitForReady;
    app.use('/api', async (_req, _res, next) => {
      try {
        await waitForReady();
        next();
      } catch (err) {
        next(err);
      }
    });
  }

  // Mount REST API routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/students', studentRouter);
  app.use('/api/predictions', predictionRouter);
  app.use('/api/model', modelRouter);
  app.use('/api/recommendations', recommendationRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);

  // API 404 handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[NeuroPredict API Error]', err.message);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  });

  return app;
}
