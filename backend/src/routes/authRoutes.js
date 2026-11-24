import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  getRegistrationStatus
} from '../controllers/authController.js';
import { protect, csrfCheck, authLimiter } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/registration-status', getRegistrationStatus);
router.post('/register', authLimiter, csrfCheck, register);
router.post('/login', authLimiter, csrfCheck, login);
router.post('/logout', logout);

// Protected routes (requires valid session cookie)
router.get('/me', protect, getMe);

export default router;
