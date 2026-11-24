import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Resolve .env at project root (one level above backend)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Load environment variables from the root .env file (already done above)

import app from './app.js';
import connectDB from './config/db.js';
import RegistrationSlot from './models/RegistrationSlot.js';

const PORT = process.env.PORT || 5000;

// Initialize database connection
// Skip DB connection if placeholder password is present
if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('<PASSWORD>')) {
  console.warn('\n⚠️ [Database Warning] MONGODB_URI contains placeholder <PASSWORD>. Skipping MongoDB connection.');
  var isConnected = false;
} else {
  var isConnected = await connectDB();
}

if (isConnected) {
  try {
    await RegistrationSlot.initializeSlots();
    console.log('🔒 [Security] Registration slots (limit: 2) verified.');
  } catch (err) {
    console.error('Failed to initialize registration slots:', err.message);
  }
}

// Start Express HTTP server with Socket.IO integration
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import { initChatSocket } from './socket/chatSocket.js';

const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

// Initialise socket event handlers
initChatSocket(io);

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 [Server] Just Us Backend is listening on port ${PORT}`);
  console.log(`📡 [Health Check] http://localhost:${PORT}/api/health`);
  console.log(`🌐 [Environment] ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ [Unhandled Rejection] ${err.message}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ [Uncaught Exception] ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 [Server] Shutting down gracefully...');
  server.close(() => {
    console.log('🔒 [Server] Closed HTTP server.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { io as socketIo }; // Export Socket.IO instance for testing
export default server;
