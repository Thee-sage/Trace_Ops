import mongoose from 'mongoose';
import { logger } from '../utils/logger';

let isConnected = false;

export async function connectToMongoDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  if (isConnected) {
    logger.info('Already connected to MongoDB');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    isConnected = true;
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

export function getConnectionStatus(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', error);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
  isConnected = true;
});
