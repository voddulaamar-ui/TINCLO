import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jobRoutes from './routes/jobs.js';
import matchRoutes from './routes/matches.js';
import userRoutes from './routes/users.js';
import externalJobRoutes from './routes/externalJobs.js';
import jobViewRoutes from './routes/jobViews.js';
import applyRoutes from './routes/apply.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import recruiterRoutes from './routes/recruiter.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import companyRoutes from './routes/companies.js';
import analyticsRoutes from './routes/analytics.js';
import searchHistoryRoutes from './routes/searchHistory.js';
import recentViewRoutes from './routes/recentViews.js';
import trendingRoutes from './routes/trending.js';
import uploadRoutes from './routes/uploads.js';
import resumeParserRoutes from './routes/resumeParser.js';
import interviewRoutes from './routes/interviews.js';
import offerRoutes from './routes/offers.js';
import savedSearchRoutes from './routes/savedSearches.js';
import bookmarkRoutes from './routes/bookmarks.js';
import careerInsightsRoutes from './routes/careerInsights.js';
import referralRoutes from './routes/referrals.js';
import interviewFeedbackRoutes from './routes/interviewFeedback.js';
import adminAdvancedRoutes from './routes/adminAdvanced.js';
import portfolioRoutes from './routes/portfolio.js';
import organizationRoutes from './routes/organization.js';
import messagingRoutes from './routes/messaging.js';
import pushNotificationRoutes from './routes/pushNotifications.js';
import aiRoutes from './routes/ai.js';
import learningRoutes from './routes/learning.js';
import gamificationRoutes from './routes/gamification.js';
import billingRoutes from './routes/billing.js';
import integrationRoutes from './routes/integrations.js';
import superAdminRoutes from './routes/superAdmin.js';
import devopsRoutes from './routes/devops.js';
import globalRoutes from './routes/global.js';
import biRoutes from './routes/bi.js';
import marketplaceRoutes from './routes/marketplace.js';
import hrmsRoutes from './routes/hrms.js';
import assessmentRoutes from './routes/assessments.js';
import copilotRoutes from './routes/copilot.js';
import pluginRoutes from './routes/plugins.js';
import workflowRoutes from './routes/workflows.js';
import automationFlowRoutes from './routes/automations.js';
import developerRoutes from './routes/developer.js';
import mobileRoutes from './routes/mobile.js';
import aiStudioRoutes from './routes/aiStudio.js';
import agentMarketplaceRoutes from './routes/agentMarketplace.js';
import bpmRoutes from './routes/bpm.js';
import biStudioRoutes from './routes/biStudio.js';
import tosRoutes from './routes/tos.js';
import passportRoutes from './routes/passport.js';
import skillGraphRoutes from './routes/skillGraph.js';
import careerDnaRoutes from './routes/careerDna.js';
import careerSimulationRoutes from './routes/careerSimulation.js';
import heatmapRoutes from './routes/heatmap.js';
import commandCenterRoutes from './routes/commandCenter.js';
import benchmarkRoutes from './routes/benchmark.js';
import hackathonRoutes from './routes/hackathons.js';
import careerFairRoutes from './routes/careerFairs.js';
import verifiedSkillsRoutes from './routes/verifiedSkills.js';
import {
  helmetMiddleware, compressionMiddleware, generalLimiter, authLimiter,
  sanitizeMiddleware, hppMiddleware, xssClean,
} from './middleware/security.js';
import globalErrorHandler from './middleware/errorHandler.js';
import morgan from 'morgan';
import logger from './utils/logger.js';

dotenv.config();
mongoose.set('bufferCommands', false);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5002;

const isMongoConnected = () => mongoose.connection.readyState === 1;

const requireMongoConnection = (req, res, next) => {
  if (!isMongoConnected()) {
    return res.status(503).json({
      message: 'Database unavailable. The API server is running, but MongoDB Atlas is not connected yet.',
    });
  }
  next();
};

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
});

// Track online users — exposed to routes via app.get('onlineUsers')
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`👤 User ${userId} joined`);
  });

  // ── Presence ─────────────────────────────────────────────────────────────
  socket.on('presence:update', ({ status }) => {
    // status: 'online' | 'away' | 'busy' | 'offline'
    if (socket.userId) {
      io.emit('presence:changed', { userId: socket.userId, status, lastSeen: new Date().toISOString() });
    }
  });

  // ── Typing indicators ────────────────────────────────────────────────────
  socket.on('chat:typing', ({ conversationId, isTyping }) => {
    socket.broadcast.emit('chat:typing', { conversationId, userId: socket.userId, isTyping });
  });

  // ── Message delivered acknowledgment ─────────────────────────────────────
  socket.on('chat:delivered', ({ messageId, conversationId }) => {
    socket.broadcast.emit('chat:delivered', { messageId, conversationId, userId: socket.userId, at: new Date().toISOString() });
  });

  socket.on('notification:send', ({ toUserId, notification }) => {
    const targetSocket = onlineUsers.get(toUserId);
    if (targetSocket) io.to(targetSocket).emit('notification:receive', notification);
  });

  socket.on('chat:message', ({ toUserId, message, fromUser }) => {
    const targetSocket = onlineUsers.get(toUserId);
    const msgData = { ...message, fromUser, timestamp: new Date().toISOString() };
    if (targetSocket) io.to(targetSocket).emit('chat:message', msgData);
    socket.emit('chat:message', msgData);
  });

  socket.on('job:liked', ({ userId, jobTitle, company }) => {
    socket.emit('notification:receive', {
      id: Date.now(),
      type: 'match',
      title: 'Job Liked! 🎯',
      message: `You liked ${jobTitle} at ${company}`,
      time: 'Just now',
      read: false,
      icon: '🎯',
    });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('users:online', Array.from(onlineUsers.keys()));
      io.emit('presence:changed', { userId: socket.userId, status: 'offline', lastSeen: new Date().toISOString() });
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });

  // ── Command Center real-time events ─────────────────────────────────────
  socket.on('command-center:subscribe', (orgId) => {
    socket.join(`cc:${orgId || 'global'}`);
  });

  socket.on('command-center:event', (data) => {
    // Broadcast recruitment events to command center subscribers
    const room = data.orgId ? `cc:${data.orgId}` : 'cc:global';
    io.to(room).emit('command-center:activity', data);
  });
});

// Expose io and onlineUsers to routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ── Middleware ───────────────────────────────────────────────────────────────
// Security headers
app.use(helmetMiddleware);

// Compression
app.use(compressionMiddleware);

// Request logging (Morgan → Winston in production, console in dev)
const morganStream = { write: (msg) => logger.info(msg.trim(), { type: 'http' }) };
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  process.env.NODE_ENV === 'production' ? { stream: morganStream } : {}
));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: sanitize inputs against NoSQL injection
app.use(sanitizeMiddleware);

// Security: prevent HTTP parameter pollution
app.use(hppMiddleware);

// Security: strip XSS from inputs
app.use(xssClean);

// General rate limiting (200 req / 15 min per IP)
app.use('/api', generalLimiter);

// Strict rate limiting on auth endpoints (10 req / 15 min per IP)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
// All routes available under /api (current) and /api/v1 (versioned)
const registerRoutes = (prefix) => {
  app.use(`${prefix}/external-jobs`, externalJobRoutes);
  app.use(`${prefix}/jobs`,          requireMongoConnection, jobRoutes);
  app.use(`${prefix}/matches`,       requireMongoConnection, matchRoutes);
  app.use(`${prefix}/users`,         requireMongoConnection, userRoutes);
  app.use(`${prefix}/job-views`,     requireMongoConnection, jobViewRoutes);
  app.use(`${prefix}/apply`,         requireMongoConnection, applyRoutes);
  app.use(`${prefix}/auth`,          requireMongoConnection, authRoutes);
  app.use(`${prefix}/admin`,         requireMongoConnection, adminRoutes);
  app.use(`${prefix}/recruiter`,     requireMongoConnection, recruiterRoutes);
  app.use(`${prefix}/dashboard`,     requireMongoConnection, dashboardRoutes);
  app.use(`${prefix}/notifications`, requireMongoConnection, notificationRoutes);
  app.use(`${prefix}/companies`,     requireMongoConnection, companyRoutes);
  app.use(`${prefix}/analytics`,     requireMongoConnection, analyticsRoutes);
  app.use(`${prefix}/search-history`,requireMongoConnection, searchHistoryRoutes);
  app.use(`${prefix}/recent-views`,  requireMongoConnection, recentViewRoutes);
  app.use(`${prefix}/trending`,      requireMongoConnection, trendingRoutes);
  app.use(`${prefix}/uploads`,       requireMongoConnection, uploadRoutes);
  app.use(`${prefix}/resume`,        requireMongoConnection, resumeParserRoutes);
  app.use(`${prefix}/interviews`,    requireMongoConnection, interviewRoutes);
  app.use(`${prefix}/offers`,         requireMongoConnection, offerRoutes);
  app.use(`${prefix}/saved-searches`, requireMongoConnection, savedSearchRoutes);
  app.use(`${prefix}/bookmarks`,      requireMongoConnection, bookmarkRoutes);
  app.use(`${prefix}/career-insights`,requireMongoConnection, careerInsightsRoutes);
  app.use(`${prefix}/referrals`,      requireMongoConnection, referralRoutes);
  app.use(`${prefix}/interview-feedback`, requireMongoConnection, interviewFeedbackRoutes);
  app.use(`${prefix}/admin/advanced`,    requireMongoConnection, adminAdvancedRoutes);
  app.use(`${prefix}/portfolio`,         requireMongoConnection, portfolioRoutes);
  app.use(`${prefix}/org`,               requireMongoConnection, organizationRoutes);
  app.use(`${prefix}/messaging`,          requireMongoConnection, messagingRoutes);
  app.use(`${prefix}/push`,              requireMongoConnection, pushNotificationRoutes);
  app.use(`${prefix}/ai`,                requireMongoConnection, aiRoutes);
  app.use(`${prefix}/learning`,          requireMongoConnection, learningRoutes);
  app.use(`${prefix}/gamification`,      requireMongoConnection, gamificationRoutes);
  app.use(`${prefix}/billing`,           requireMongoConnection, billingRoutes);
  app.use(`${prefix}/integrations`,      requireMongoConnection, integrationRoutes);
  app.use(`${prefix}/super-admin`,       requireMongoConnection, superAdminRoutes);
  app.use(`${prefix}/devops`,            devopsRoutes);
  app.use(`${prefix}/global`,            globalRoutes);
  app.use(`${prefix}/bi`,               requireMongoConnection, biRoutes);
  app.use(`${prefix}/marketplace`,      requireMongoConnection, marketplaceRoutes);
  app.use(`${prefix}/hrms`,             requireMongoConnection, hrmsRoutes);
  app.use(`${prefix}/assessments`,      requireMongoConnection, assessmentRoutes);
  app.use(`${prefix}/copilot`,          requireMongoConnection, copilotRoutes);
  app.use(`${prefix}/plugins`,          pluginRoutes);
  app.use(`${prefix}/workflows`,       requireMongoConnection, workflowRoutes);
  app.use(`${prefix}/automations`,     requireMongoConnection, automationFlowRoutes);
  app.use(`${prefix}/developer`,       requireMongoConnection, developerRoutes);
  app.use(`${prefix}/mobile`,          requireMongoConnection, mobileRoutes);
  app.use(`${prefix}/ai-studio`,      requireMongoConnection, aiStudioRoutes);
  app.use(`${prefix}/agents`,         agentMarketplaceRoutes);
  app.use(`${prefix}/bpm`,            requireMongoConnection, bpmRoutes);
  app.use(`${prefix}/bi-studio`,     requireMongoConnection, biStudioRoutes);
  app.use(`${prefix}/tos`,           requireMongoConnection, tosRoutes);
  app.use(`${prefix}/passport`,      passportRoutes);
  app.use(`${prefix}/skills`,        skillGraphRoutes);
  app.use(`${prefix}/career-dna`,   requireMongoConnection, careerDnaRoutes);
  app.use(`${prefix}/career-simulation`, requireMongoConnection, careerSimulationRoutes);
  app.use(`${prefix}/heatmap`,           requireMongoConnection, heatmapRoutes);
  app.use(`${prefix}/command-center`,   requireMongoConnection, commandCenterRoutes);
  app.use(`${prefix}/benchmark`,        requireMongoConnection, benchmarkRoutes);
  app.use(`${prefix}/hackathons`,       requireMongoConnection, hackathonRoutes);
  app.use(`${prefix}/career-fairs`,    requireMongoConnection, careerFairRoutes);
  app.use(`${prefix}/verified-skills`, requireMongoConnection, verifiedSkillsRoutes);
};

// Register under both /api and /api/v1
registerRoutes('/api');
registerRoutes('/api/v1');

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    success:     true,
    status:      'OK',
    message:     'TINCLO API is running',
    database:    isMongoConnected() ? 'connected' : 'disconnected',
    version:     '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime:      Math.floor(process.uptime()),
    uptimeHuman: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
    memory: {
      rss:       `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed:  `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
    features: [
      'JWT Auth', 'Email Verification', 'Brute Force Protection',
      'Socket.io', 'Cloudinary Uploads', 'Rate Limiting',
      'Dashboards', 'Notifications', 'Company Pages',
      'Analytics', 'Rule-Based Matching', 'Audit Logs',
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── API Version endpoint ─────────────────────────────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({
    success:     true,
    version:     '3.0.0',
    phase:       3,
    environment: process.env.NODE_ENV || 'development',
    uptime:      Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    apiVersions: ['v1'],
  });
});

// ── 404 handler — unknown routes ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errorCode: 'NOT_FOUND',
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    startJobExpiryChecker();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('API server is still running. Database routes will return 503 until Atlas is reachable.');
  });

// ── Job expiry notification checker ──────────────────────────────────────────
// Runs every 6 hours. Notifies recruiters when a job deadline is within 48 h.
function startJobExpiryChecker() {
  import('./models/Job.js').then(({ default: Job }) =>
    import('./models/Notification.js').then(({ default: Notification }) => {
      const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

      const runCheck = async () => {
        try {
          const now    = new Date();
          const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48 h
          // Open jobs whose deadline falls within the next 48 hours
          const jobs = await Job.find({
            status:   'open',
            deadline: { $gte: now, $lte: cutoff },
          }).lean();

          for (const job of jobs) {
            if (!job.postedBy) continue;
            // Avoid duplicate notifications — check if one was already sent today
            const alreadySent = await Notification.exists({
              userId:    job.postedBy,
              type:      'job_expiry_warning',
              'metadata.jobId': String(job._id),
              createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
            });
            if (alreadySent) continue;

            const hoursLeft = Math.round((new Date(job.deadline) - now) / 3_600_000);
            const notif = await Notification.create({
              userId:   job.postedBy,
              audience: 'recruiter',
              type:     'job_expiry_warning',
              title:    `⏰ Job Expiring Soon: ${job.title}`,
              message:  `Your job "${job.title}" expires in ~${hoursLeft} hours. Extend or close it from your dashboard.`,
              icon:     'clock',
              metadata: { jobId: job._id, hoursLeft },
            });

            // Push to recruiter if online
            const targetSocket = onlineUsers.get(job.postedBy);
            if (targetSocket) {
              io.to(targetSocket).emit('notification:receive', {
                id:      notif._id,
                type:    'job_expiry_warning',
                title:   notif.title,
                message: notif.message,
                time:    'Just now',
                read:    false,
                icon:    '⏰',
              });
            }
            console.log(`⚠️  Expiry warning sent for job "${job.title}" (${hoursLeft}h left)`);
          }
        } catch (err) {
          console.error('Job expiry check error:', err.message);
        }
      };

      // Run immediately on startup, then every 6 hours
      runCheck();
      setInterval(runCheck, CHECK_INTERVAL_MS);
      console.log('⏰ Job expiry checker started (runs every 6 h)');
    }),
  );
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TINCLO Server running on port ${PORT}`);
  console.log('Socket.io enabled for real-time notifications');
});
