import express from 'express';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ 
    testValue: process.env.TEST_VALUE || 'not set',
    message: 'Change TEST_VALUE in .env and restart to trigger CONFIG_CHANGE event'
  });
});

export default router;

