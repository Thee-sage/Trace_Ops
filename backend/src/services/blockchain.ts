import { ethers } from 'ethers';
import { config } from '../utils/config';
import { generateTimelineHash } from '../utils/hash';
import { Event } from '../models/Event';
import { logger } from '../utils/logger';

const CONTRACT_ABI = [
  'function anchorTimeline(string memory serviceName, bytes32 hash, uint256 timestamp) external',
  'function getAnchor(string memory serviceName, uint256 timestamp) external view returns (bytes32 hash, uint256 anchorTimestamp, address anchoredBy)',
  'event TimelineAnchored(string indexed serviceName, bytes32 indexed hash, uint256 timestamp, address indexed anchoredBy)',
];

class BlockchainService {
  private provider: ethers.providers.Provider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;

  async initialize(): Promise<void> {
    if (!config.ethereumRpcUrl) {
      logger.warn('Ethereum RPC URL not configured, blockchain features disabled');
      return;
    }

    if (!config.ethereumPrivateKey) {
      logger.warn('Ethereum private key not configured, blockchain features disabled');
      return;
    }

    try {
      this.provider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl);
      this.wallet = new ethers.Wallet(config.ethereumPrivateKey, this.provider);

      if (config.ethereumContractAddress) {
        this.contract = new ethers.Contract(
          config.ethereumContractAddress,
          CONTRACT_ABI,
          this.wallet
        );
        logger.info('Blockchain service initialized', {
          address: this.wallet.address,
          contractAddress: config.ethereumContractAddress,
        });
      } else {
        logger.warn('Ethereum contract address not configured');
      }
    } catch (error) {
      logger.error('Failed to initialize blockchain service', error);
      throw error;
    }
  }

  async anchorTimeline(serviceName: string, events: Event[]): Promise<string> {
    if (!this.contract || !this.wallet) {
      throw new Error('Blockchain service not initialized. Check ETHEREUM_RPC_URL and ETHEREUM_PRIVATE_KEY environment variables.');
    }

    if (events.length === 0) {
      throw new Error('Cannot anchor empty timeline');
    }

    try {
      const hash = generateTimelineHash(events);
      const timestamp = Math.floor(Date.now() / 1000);

      logger.info('Anchoring timeline to blockchain', {
        serviceName,
        hash,
        eventCount: events.length,
      });

      const tx = await this.contract.anchorTimeline(
        serviceName,
        hash,
        timestamp,
        {
          gasLimit: 500000,
        }
      );

      logger.info('Transaction sent, waiting for confirmation', {
        txHash: tx.hash,
      });

      const receipt = await tx.wait();

      logger.info('Timeline anchored successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return receipt.hash;
    } catch (error) {
      logger.error('Failed to anchor timeline', error);
      throw error;
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      logger.error('Failed to verify transaction', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.contract !== null && this.wallet !== null;
  }
}

export const blockchainService = new BlockchainService();

