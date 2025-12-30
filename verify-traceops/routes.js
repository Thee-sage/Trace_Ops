import express from 'express';

const router = express.Router();

router.get('/ok', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});


router.get('/crash', (req, res) => {
  throw new Error('Intentional crash for TraceOps verification');
});


router.get('/config-test', (req, res) => {
  res.json({ 
    testValue: process.env.TEST_VALUE || 'not set',
    message: 'Change TEST_VALUE in .env and restart to trigger CONFIG_CHANGE event'
  });
});

export default router;

