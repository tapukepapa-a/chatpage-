import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * @route   GET /api/messages
 * @desc    Get chronological chat history between the two registered sanctuary accounts
 * @access  Private (JWT cookie protected)
 */
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Derive partner account directly from database
    const partner = await User.findOne({ _id: { $ne: currentUserId } }).select('email slot createdAt');

    if (!partner) {
      return res.status(200).json({
        success: true,
        messages: [],
        partner: null,
        message: 'Partner has not registered yet.'
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    // Fetch messages strictly between the two registered users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: partner._id },
        { sender: partner._id, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      messages,
      partner: {
        _id: partner._id,
        email: partner.email,
        slot: partner.slot
      }
    });
  } catch (error) {
    console.error('Error fetching message history:', error.message);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve message history.'
    });
  }
};
