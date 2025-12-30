import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
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

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
  corsOrigin: normalizeCorsOrigin(process.env.CORS_ORIGIN),
  awsRegion: process.env.AWS_REGION,
  awsCloudWatchLogGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP,
  logLevel: process.env.LOG_LEVEL || 'INFO',
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY,
  ethereumContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
};

export function validateAwsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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

