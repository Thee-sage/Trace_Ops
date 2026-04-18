import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
  corsOrigins: string[];
  mongodbUri: string;
  apiKey?: string;
  jwtSecret: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  awsRegion?: string;
  awsCloudWatchLogGroup?: string;
  logLevel?: string;
  ethereumRpcUrl?: string;
  ethereumPrivateKey?: string;
  ethereumContractAddress?: string;
}

function normalizeCorsOrigin(origin: string | undefined): string {
  if (!origin) return 'http://localhost:5173';
  return origin.replace(/\/+$/, '');
}

// Parse CORS_ORIGINS env var (comma-separated list) or fall back to defaults
function parseCorsOrigins(originsEnv: string | undefined, singleOrigin: string): string[] {
  const defaults = [
    'http://localhost:5173',
    'https://traceops.vercel.app',
  ];

  if (!originsEnv) return defaults;

  const parsed = originsEnv
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return parsed.length > 0 ? parsed : defaults;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
  corsOrigin: normalizeCorsOrigin(process.env.CORS_ORIGIN),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS, normalizeCorsOrigin(process.env.CORS_ORIGIN)),
  mongodbUri: process.env.MONGODB_URI || '',
  apiKey: process.env.TRACEOPS_API_KEY || undefined,
  jwtSecret: process.env.JWT_SECRET || 'traceops-dev-secret-change-in-production',
  gmailUser: process.env.GMAIL_USER,
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD,
  awsRegion: process.env.AWS_REGION,
  awsCloudWatchLogGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP,
  logLevel: process.env.LOG_LEVEL || 'INFO',
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
  ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
};

export function validateAwsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.mongodbUri) {
    errors.push('MONGODB_URI must be set');
  }

  if (config.nodeEnv === 'production') {
    if (!config.corsOrigin || config.corsOrigin === 'http://localhost:5173') {
      errors.push('CORS_ORIGIN must be set in production (should point to your frontend URL)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

