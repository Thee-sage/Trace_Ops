import express from 'express';
import dotenv from 'dotenv';
import errorRoutes from './routes/error.js';
import configRoutes from './routes/config.js';
import loadRoutes from './routes/load.js';

import TraceOps from '../client/traceops.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

TraceOps.init({
  endpoint: process.env.TRACEOPS_ENDPOINT || 'https://trace-ops.onrender.com',
  serviceName: 'traceops-verify-app'
});

app.use(express.json());

app.use('/error', errorRoutes);
app.use('/config', configRoutes);
app.use('/load', loadRoutes);

app.get('/ok', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/crash', (req, res) => {
  throw new Error('Intentional crash for TraceOps verification');
});

app.get('/config-test', (req, res) => {
  res.json({ 
    testValue: process.env.TEST_VALUE || 'not set',
    message: 'Change TEST_VALUE in .env and restart to trigger CONFIG_CHANGE event'
  });
});

TraceOps.express(app);

app.listen(PORT, () => {
  console.log(`\n✅ TraceOps verification app running on http://localhost:${PORT}`);
  console.log(`\nTest endpoints:`);
  console.log(`  GET http://localhost:${PORT}/ok - Health check`);
  console.log(`\nStage 2 - Issue Grouping:`);
  console.log(`  GET http://localhost:${PORT}/error/same - Deterministic error (same issue)`);
  console.log(`  GET http://localhost:${PORT}/error/same-again - Same error (same issue)`);
  console.log(`  GET http://localhost:${PORT}/error/different - Different error (different issue)`);
  console.log(`  GET http://localhost:${PORT}/error/critical - High severity error (critical keyword)`);
  console.log(`  GET http://localhost:${PORT}/error/fatal - High severity error (fatal keyword)`);
  console.log(`  GET http://localhost:${PORT}/error/timeout - High severity error (timeout keyword)`);
  console.log(`\nStage 3 - Lifecycle:`);
  console.log(`  GET http://localhost:${PORT}/error/same - Trigger error multiple times`);
  console.log(`  Restart server - Triggers DEPLOY, resolves issues`);
  console.log(`\nStage 4 - Impact & Signal:`);
  console.log(`  GET http://localhost:${PORT}/load/light - Single error`);
  console.log(`  GET http://localhost:${PORT}/load/heavy - Multiple errors (spike)`);
  console.log(`\nTraceOps will capture:`);
  console.log(`  - DEPLOY event (on server start)`);
  console.log(`  - ERROR events (when error routes are called)`);
  console.log(`  - CONFIG_CHANGE event (when TEST_VALUE changes and server restarts)`);
  console.log(`\nTraceOps endpoint: ${process.env.TRACEOPS_ENDPOINT || 'https://trace-ops.onrender.com'}`);
  console.log(`\nSee scenarios.md for detailed testing instructions`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

app.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

