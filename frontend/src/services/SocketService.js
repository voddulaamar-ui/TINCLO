/**
 * Socket.io client service for real-time notifications
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';

let socket = null;

const SocketService = {
  connect(userId) {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      if (userId) {
        socket.emit('user:join', userId);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection failed (backend may be offline):', err.message);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  // Emit job liked event to trigger notification
  emitJobLiked(userId, jobTitle, company) {
    if (socket?.connected) {
      socket.emit('job:liked', { userId, jobTitle, company });
    }
  },

  // Listen for incoming notifications
  onNotification(callback) {
    if (socket) {
      socket.on('notification:receive', callback);
    }
  },

  offNotification() {
    if (socket) {
      socket.off('notification:receive');
    }
  },

  /**
   * Listen for new jobs pushed from the backend.
   * Callback receives: { jobs: Job[], newCount: number, query?: string }
   */
  onNewJobs(callback) {
    if (socket) {
      socket.on('jobs:new', callback);
    }
  },

  offNewJobs() {
    if (socket) {
      socket.off('jobs:new');
    }
  },

  /**
   * Subscribe to a preferences-matched notification.
   * Callback receives: { title, message, matchedJobs: Job[] }
   */
  onJobMatch(callback) {
    if (socket) {
      socket.on('jobs:match', callback);
    }
  },

  offJobMatch() {
    if (socket) {
      socket.off('jobs:match');
    }
  },
};

export default SocketService;
