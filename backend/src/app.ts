import express, { Express } from 'express';
import cors from 'cors';
import { config } from './utils/config';
import { logger } from './utils/logger';
import healthRouter from './routes/health';
import eventsRouter from './routes/events';
import issuesRouter from './routes/issues';
import blockchainRouter from './routes/blockchain';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/events', eventsRouter);
  app.use('/issues', issuesRouter);
  app.use('/blockchain', blockchainRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'TraceOps Backend',
      version: '0.1.0',
      status: 'running',
    });
  });

  app.use((req, res) => {
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

