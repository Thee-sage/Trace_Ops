import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    eventCount: storage.count(),
  });
});

export default router;

