import express from 'express';
import { getDatabaseStatus } from '../config/db.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint returning server and database status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: 'ok',
    message: 'Just Us backend service is running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.status,
      connected: dbStatus.isConnected,
      host: dbStatus.host
    }
  });
});

export default router;
