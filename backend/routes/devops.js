/**
 * /api/devops — Infrastructure monitoring, health, metrics, deployment status
 * Admin-only endpoints for operational visibility.
 */
import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();
const startTime = Date.now();

// ── Public health endpoints (no auth — used by load balancers/k8s probes) ────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

router.get('/readiness', async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (dbReady) res.json({ ready: true });
  else res.status(503).json({ ready: false, reason: 'database not connected' });
});

router.get('/liveness', (req, res) => {
  res.json({ alive: true, pid: process.pid });
});

// ── Admin-only operational endpoints ─────────────────────────────────────────

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  res.json({
    success: true,
    metrics: {
      uptime: Math.floor(process.uptime()),
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external },
      cpu: { user: cpu.user, system: cpu.system },
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      database: { status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', host: mongoose.connection.host || 'unknown' },
      cache: cache.stats(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/deployment', (req, res) => {
  res.json({
    success: true,
    deployment: {
      version: '14.0.0',
      phase: 14,
      environment: process.env.NODE_ENV || 'development',
      startedAt: new Date(startTime).toISOString(),
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      nodeVersion: process.version,
      features: {
        ai: process.env.AI_ENABLED !== 'false',
        redis: !!process.env.REDIS_URL,
        cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
        socketio: true,
      },
    },
  });
});

router.get('/queues', (req, res) => {
  // Placeholder — real impl reads from Redis/Bull queue stats
  res.json({
    success: true,
    queues: {
      email: { pending: 0, completed: 0, failed: 0 },
      notifications: { pending: 0, completed: 0, failed: 0 },
      ai: { pending: 0, completed: 0, failed: 0 },
      reports: { pending: 0, completed: 0, failed: 0 },
    },
  });
});

router.post('/cache/flush', (req, res) => {
  cache.flush();
  res.json({ success: true, message: 'Cache flushed.' });
});

export default router;
