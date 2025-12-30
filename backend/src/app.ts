import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { logger } from './utils/logger';
import healthRouter from './routes/health';
import eventsRouter from './routes/events';
import issuesRouter from './routes/issues';
import blockchainRouter from './routes/blockchain';
import { storage } from './services/storage';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://traceops.vercel.app'
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false,
    methods: ['GET', 'POST'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/events', eventsRouter);
  app.use('/issues', issuesRouter);
  app.use('/blockchain', blockchainRouter);

  app.get('/services', (_req: Request, res: Response) => {
    try {
      const allEvents = storage.findAll();
      const serviceNames = new Set<string>();
      
      allEvents.forEach((event) => {
        if (event.serviceName) {
          serviceNames.add(event.serviceName);
        }
      });
      
      return res.json(Array.from(serviceNames).sort());
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
      version: '0.1.0',
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

