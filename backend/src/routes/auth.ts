import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../utils/config';
import { UserModel } from '../models/UserSchema';
import { requireAuth } from '../middleware/auth';

const router = Router();

function generateApiKey(): string {
  return 'tr_' + crypto.randomBytes(24).toString('hex');
}

function generateUserId(): string {
  return `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '30d' });
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'name'],
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const apiKey = generateApiKey();
    const userId = generateUserId();

    const user = await UserModel.create({
      _id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      apiKey,
      createdAt: Date.now(),
    });

    const token = signToken(userId, user.email);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password'],
      });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user._id, user.email);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /auth/me — requires JWT
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      apiKey: user.apiKey,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
