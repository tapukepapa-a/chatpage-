import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust the hosting platform's reverse proxy (correct client IPs for rate limiting)
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-JustUs-Client']
  })
);

// Body Parsing & Cookie Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Just Us API',
    version: '1.0.0',
    description: 'Backend service for Just Us private couple chat',
    endpoints: {
      health: '/api/health',
      registrationStatus: '/api/auth/registration-status',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      logout: 'POST /api/auth/logout'
    }
  });
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../dist')));
  // SPA fallback – serve index.html for any unknown route
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../dist', 'index.html'));
  });
}

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

export default app;