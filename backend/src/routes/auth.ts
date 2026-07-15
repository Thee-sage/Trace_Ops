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

// ── Password Reset ──

// In-memory store: email → { code, expiresAt }
const resetCodes = new Map<string, { code: string; expiresAt: number }>();

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email exists, a reset code has been sent.' });
    }

    const code = generateResetCode();
    resetCodes.set(user.email, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

    // Send email via Gmail SMTP (fire-and-forget so response isn't blocked)
    if (config.gmailUser && config.gmailAppPassword) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: config.gmailUser,
          pass: config.gmailAppPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        dnsTimeout: 10000,
        family: 4,
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Don't await — send in background so the API responds immediately
      transporter.sendMail({
        from: `"TraceOps" <${config.gmailUser}>`,
        to: user.email,
        subject: 'Your TraceOps password reset code',
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="font-size: 18px; font-weight: 500; margin-bottom: 16px;">Password Reset</h2>
            <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
              Use this code to reset your TraceOps password. It expires in 15 minutes.
            </p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 600; letter-spacing: 8px; font-family: monospace;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #999;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      }).then(() => {
        console.log(`[PASSWORD RESET] ✅ Email sent to ${user.email}`);
      }).catch((emailErr: Error) => {
        console.error(`[PASSWORD RESET] ❌ Email send FAILED: ${emailErr.message}`);
        console.log(`[PASSWORD RESET] Fallback code for ${user.email}: ${code}`);
      });
    } else {
      console.log(`[PASSWORD RESET] No Gmail configured. Code for ${user.email}: ${code}`);
    }

    return res.json({
      message: 'If that email exists, a reset code has been sent.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'code', 'newPassword'],
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const stored = resetCodes.get(normalizedEmail);

    if (!stored || stored.code !== code) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(normalizedEmail);
      return res.status(400).json({ error: 'Reset code has expired. Request a new one.' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await UserModel.findOneAndUpdate({ email: normalizedEmail }, { passwordHash });

    // Clean up used code
    resetCodes.delete(normalizedEmail);

    return res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;

