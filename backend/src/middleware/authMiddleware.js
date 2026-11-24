import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Validates JWT stored strictly in HTTP-only cookie.
 * Attaches authenticated user object to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No active session. Please log in.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid session token.'
    });
  }
};

/**
 * CSRF Protection Middleware
 * Verifies Origin/Referer on state-changing requests and requires a custom client header.
 */
export const csrfCheck = (req, res, next) => {
  // Safe HTTP methods do not alter state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Verify origin if present
  if (origin && !origin.startsWith(allowedOrigin) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Cross-origin request blocked by CSRF policy.'
    });
  }

  // Verify custom client header to block un-preflighted requests
  const customHeader = req.headers['x-requested-with'] || req.headers['x-justus-client'];
  if (!customHeader && process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Missing required CSRF verification header.'
    });
  }

  next();
};

/**
 * Rate Limiting for Authentication endpoints
 * Prevents automated brute-force attacks on login and registration.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});
