import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import RegistrationSlot from '../models/RegistrationSlot.js';

// Helper to generate and set HTTP-only JWT cookie
const sendTokenCookie = (user, res, statusCode, message) => {
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      slot: user.slot
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('jwt', token, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    message,
    user: user.toJSON()
  });
};

/**
 * @route   GET /api/auth/registration-status
 * @desc    Checks if registration is open and returns registered account count
 * @access  Public
 */
export const getRegistrationStatus = async (req, res) => {
  try {
    const status = await RegistrationSlot.getRegistrationStatus();
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error checking registration status:', error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve registration status.'
    });
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (strictly up to 2 accounts via atomic slot allocation)
 * @access  Public
 */
export const register = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // 1. Basic validation
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Email, password, and confirm password are required.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Please provide a valid email address.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Password must be at least 6 characters long.'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Passwords do not match.'
    });
  }

  // 2. Atomic Slot Allocation
  // Generate a temporary reservation identifier
  const reservationId = new mongoose.Types.ObjectId();
  const slot = await RegistrationSlot.claimSlot(reservationId);

  if (!slot) {
    return res.status(403).json({
      error: 'Registration Closed',
      message: 'Registration is permanently closed. The two sanctuary accounts are already established.'
    });
  }

  try {
    // 3. Create user in database with the atomically allocated slot
    const newUser = await User.create({
      email: normalizedEmail,
      password,
      slot: slot.slot
    });

    // 4. Confirm slot assignment with actual user ID
    await RegistrationSlot.confirmSlot(slot.slot, newUser._id);

    // 5. Issue HTTP-only cookie session
    return sendTokenCookie(newUser, res, 201, 'Sanctuary account created successfully.');
  } catch (error) {
    // Release the claimed slot if user creation failed
    await RegistrationSlot.releaseSlot(slot.slot, reservationId);

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate Email',
        message: 'An account with this email address already exists.'
      });
    }

    console.error('Registration error:', error.message);
    return res.status(500).json({
      error: 'Registration Failed',
      message: 'An error occurred during account creation. Please try again.'
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and set secure HTTP-only cookie
 * @access  Public
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Registered email and password are required.'
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Invalid email or password.'
      });
    }

    return sendTokenCookie(user, res, 200, 'Logged in successfully.');
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Verify current session and return authenticated user and partner details
 * @access  Private (protected by JWT cookie)
 */
export const getMe = async (req, res) => {
  try {
    // Find the other registered user (the couple's partner)
    const partner = await User.findOne({ _id: { $ne: req.user._id } }).select('email slot createdAt');

    return res.status(200).json({
      success: true,
      user: req.user.toJSON(),
      partner: partner ? partner.toJSON() : null
    });
  } catch (error) {
    console.error('Error fetching authenticated session:', error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve session information.'
    });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie
 * @access  Public
 */
export const logout = (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};
