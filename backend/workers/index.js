/**
 * TINCLO Background Worker — processes async jobs (emails, AI, notifications, reports).
 * In production, use a proper queue (Bull/BullMQ with Redis).
 * This is a simple polling-based worker for the initial setup.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 TINCLO Worker starting...');

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Worker connected to MongoDB'))
  .catch(err => { console.error('MongoDB error:', err.message); process.exit(1); });

// ── Job processing loop ──────────────────────────────────────────────────────
const POLL_INTERVAL = 30000; // 30 seconds

async function processJobs() {
  try {
    // Future: pull jobs from Redis/Bull queue
    // For now, handle periodic tasks

    // 1. Check for interview reminders (24h before)
    // 2. Process pending email queue
    // 3. Run scheduled reports
    // 4. Clean up expired sessions/tokens

    // Placeholder — real implementation adds queue consumers here
  } catch (err) {
    console.error('[Worker] Error:', err.message);
  }
}

// Start polling
setInterval(processJobs, POLL_INTERVAL);
processJobs();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Worker shutting down...');
  mongoose.connection.close();
  process.exit(0);
});

console.log(`🔧 Worker running (poll every ${POLL_INTERVAL / 1000}s)`);
