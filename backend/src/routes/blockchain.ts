import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';
import { blockchainService } from '../services/blockchain';
import { generateTimelineHash } from '../utils/hash';

const router = Router();

router.post('/anchor/:serviceName', async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;

    if (!blockchainService.isAvailable()) {
      return res.status(503).json({
        error: 'Blockchain service not available',
        message: 'Ethereum RPC URL and private key must be configured',
      });
    }

    const events = storage.findAll({ serviceName });

    if (events.length === 0) {
      return res.status(404).json({
        error: 'No events found for service',
        serviceName,
      });
    }

    const hash = generateTimelineHash(events);
    const txHash = await blockchainService.anchorTimeline(serviceName, events);

    return res.json({
      serviceName,
      hash,
      txHash,
      eventCount: events.length,
      network: 'ethereum',
      message: 'Timeline anchored successfully',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to anchor timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/verify/:txHash', async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;

    if (!blockchainService.isAvailable()) {
      return res.status(503).json({
        error: 'Blockchain service not available',
      });
    }

    const verified = await blockchainService.verifyTransaction(txHash);

    return res.json({
      txHash,
      verified,
      network: 'ethereum',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to verify transaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

