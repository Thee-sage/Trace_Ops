import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { UserModel } from '../models/UserSchema';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * JWT auth middleware for dashboard reads.
 * Extracts userId from Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required', message: 'Provide Authorization: Bearer <token>' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional JWT auth for guest-accessible routes.
 * If JWT present → attaches userId (user sees own data).
 * If no JWT → passes through (guest sees all data).
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
      req.userId = payload.userId;
      req.userEmail = payload.email;
    } catch {
      // Invalid token in guest mode — just ignore it
    }
  }
  next();
}

/**
 * API key middleware for SDK ingestion (POST routes).
 * Maps x-api-key → userId and attaches to request.
 */
export async function resolveApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: 'API key required', message: 'Provide x-api-key header' });
    return;
  }

  try {
    const user = await UserModel.findOne({ apiKey }).lean();
    if (!user) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    req.userId = user._id;
    req.userEmail = user.email;
    next();
  } catch {
    res.status(500).json({ error: 'Failed to verify API key' });
  }
}
