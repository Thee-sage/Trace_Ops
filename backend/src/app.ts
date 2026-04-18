import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { logger } from './utils/logger';
import healthRouter from './routes/health';
import eventsRouter from './routes/events';
import issuesRouter from './routes/issues';
import blockchainRouter from './routes/blockchain';
import authRouter from './routes/auth';
import { storage } from './services/storage';
import { requireAuth, resolveApiKey } from './middleware/auth';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server SDK calls, curl, etc.)
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed. Add it to CORS_ORIGINS env var.`));
      }
    },
    credentials: false,
    methods: ['GET', 'POST', 'DELETE'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Public routes (no auth) ──
  app.use('/auth', authRouter);
  app.use('/health', healthRouter);

  // ── SDK ingestion: API key → userId ──
  // POST/DELETE on /events require a valid per-user API key
  app.use(['/events', '/events/batch'], (req: Request, res: Response, next: express.NextFunction) => {
    if (req.method === 'POST' || req.method === 'DELETE') {
      return resolveApiKey(req, res, next);
    }
    return next();
  });

  // ── Dashboard reads: JWT → userId ──
  // GET on /events, /issues, /services require a valid JWT
  app.use(['/events', '/issues', '/services'], (req: Request, res: Response, next: express.NextFunction) => {
    if (req.method === 'GET') {
      return requireAuth(req, res, next);
    }
    return next();
  });

  app.use('/events', eventsRouter);
  app.use('/issues', issuesRouter);
  app.use('/blockchain', blockchainRouter);

  app.get('/services', async (req: Request, res: Response) => {
    try {
      const serviceNames = await storage.listServices(req.userId);
      return res.json(serviceNames);
    } catch (error) {
      logger.error('Failed to fetch services', error);
      return res.status(500).json({
        error: 'Failed to fetch services',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'TraceOps Backend',
      version: '0.2.0',
      status: 'running',
    });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Request error', err, {
      path: req.path,
      method: req.method,
      statusCode: 500,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    });
  });

  return app;
}
