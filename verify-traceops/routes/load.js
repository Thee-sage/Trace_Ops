import express from 'express';

const router = express.Router();

router.get('/light', (req, res) => {
  throw new Error('Light load test error - single occurrence');
});

router.get('/heavy', (req, res) => {
  throw new Error('Heavy load test error - spike occurrence');
});

export default router;

