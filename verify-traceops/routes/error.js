import express from 'express';

const router = express.Router();

router.get('/same', (req, res) => {
  throw new Error('Deterministic error for issue grouping test');
});

router.get('/same-again', (req, res) => {
  throw new Error('Deterministic error for issue grouping test');
});

router.get('/different', (req, res) => {
  throw new Error('Different error message for separate issue');
});

router.get('/critical', (req, res) => {
  throw new Error('Critical system failure detected');
});

router.get('/fatal', (req, res) => {
  throw new Error('Fatal error: System crash imminent');
});

router.get('/timeout', (req, res) => {
  throw new Error('Request timeout: Service unavailable');
});

export default router;

