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
  // Production URLs will be set via FRONTEND_URL env var
].filter(Boolean);

// Socket.io setup
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('user:join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`👤 User ${userId} joined`);
  });

  socket.on('notification:send', ({ toUserId, notification }) => {
    const targetSocket = onlineUsers.get(toUserId);
    if (targetSocket) {
      io.to(targetSocket).emit('notification:receive', notification);
    }
  });

  socket.on('chat:message', ({ toUserId, message, fromUser }) => {
    const targetSocket = onlineUsers.get(toUserId);
    const msgData = { ...message, fromUser, timestamp: new Date().toISOString() };
    if (targetSocket) {
      io.to(targetSocket).emit('chat:message', msgData);
    }
    socket.emit('chat:message', msgData); // echo to sender
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
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // In production, also allow the FRONTEND_URL variations
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/external-jobs', externalJobRoutes);
app.use('/api/jobs', requireMongoConnection, jobRoutes);
app.use('/api/matches', requireMongoConnection, matchRoutes);
app.use('/api/users', requireMongoConnection, userRoutes);
app.use('/api/job-views', requireMongoConnection, jobViewRoutes);
app.use('/api/apply', requireMongoConnection, applyRoutes);
app.use('/api/auth', requireMongoConnection, authRoutes);
app.use('/api/admin', requireMongoConnection, adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TINCLO API is running',
    database: isMongoConnected() ? 'connected' : 'disconnected',
    version: '2.0.0',
    features: ['JWT Auth', 'Socket.io', 'Email', 'Admin Panel', 'Recruiter Dashboard'],
    timestamp: new Date().toISOString(),
  });
});

// Connect to MongoDB then start the server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('API server is still running. Database routes will return 503 until Atlas is reachable.');
  });

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`TINCLO Server running on port ${PORT}`);
  console.log('Socket.io enabled for real-time notifications');
});
