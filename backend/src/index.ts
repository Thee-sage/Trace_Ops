import { createApp } from './app';
import { config, validateAwsConfig } from './utils/config';
import { logger } from './utils/logger';
import { blockchainService } from './services/blockchain';
import { storage } from './services/storage';
import { EventType } from './models/Event';
// Ensure database is initialized early
import './storage/db';

const app = createApp();

blockchainService.initialize().catch((error) => {
  logger.warn('Blockchain service initialization failed (continuing without it)', error);
});

function seedDemoData(): void {
  if (config.nodeEnv !== 'development') {
    return;
  }

  const serviceName = 'demo-service';

  const existing = storage.findAll({ serviceName });
  existing.forEach((event) => {
    storage.delete(event.id);
  });

  const now = Date.now();

  storage.create({
    eventType: EventType.DEPLOY,
    serviceName,
    message: 'Demo deploy: version v1.0.0',
    timestamp: now - 6 * 60 * 1000,
  });

  storage.create({
    eventType: EventType.CONFIG_CHANGE,
    serviceName,
    message: 'Demo config change: timeout=1s',
    timestamp: now - 4 * 60 * 1000,
  });

  storage.create({
    eventType: EventType.ERROR,
    serviceName,
    message: 'Demo error: payment timeout',
    timestamp: now - 1 * 60 * 1000,
  });

  logger.info('Seeded demo events for demo-service', {
    serviceName,
    eventCount: 3,
  });
}

const configValidation = validateAwsConfig();
if (!configValidation.valid) {
  configValidation.errors.forEach((error) => logger.warn(`Config validation: ${error}`));
}

seedDemoData();

const server = app.listen(config.port, () => {
  logger.info('TraceOps Backend started', {
    port: config.port,
    environment: config.nodeEnv,
    corsOrigin: config.corsOrigin,
    awsRegion: config.awsRegion,
    cloudWatchLogGroup: config.awsCloudWatchLogGroup,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason, { promise: String(promise) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

