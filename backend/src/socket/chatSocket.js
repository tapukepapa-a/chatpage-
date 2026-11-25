import jwt from 'jsonwebtoken';
import { parseCookie } from 'cookie';
import User from '../models/User.js';
import Message from '../models/Message.js';

// Map of userId string -> Set of socket IDs (multi-tab support)
const onlineUsers = new Map();
// Map of recent clientMessageId per user to prevent duplicate submissions
const recentMessageIds = new Map();

/**
 * Socket.IO Authentication Middleware
 * Validates JWT stored in HTTP-only cookie from handshake headers.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    // Preferred: short-lived token sent by the browser (works across sites, e.g. Vercel -> Render)
    let token = socket.handshake.auth?.token;
    let requireSocketPurpose = true;

    // Fallback: session cookie (works when frontend and backend share one origin)
    if (!token) {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No session provided'));
      }
      token = parseCookie(cookieHeader).jwt;
      requireSocketPurpose = false;
    }

    if (!token) {
      return next(new Error('Authentication error: No token found'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (requireSocketPurpose && decoded.purpose !== 'socket') {
      return next(new Error('Authentication error: Invalid token'));
    }
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User does not exist'));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired session token'));
  }
};

/**
 * Initialize Socket.IO event handlers
 */
export const initChatSocket = (io) => {
  // Apply authentication middleware to every incoming socket connection
  io.use(socketAuthMiddleware);

  // Send an event to every open tab/device of one user
  const emitToUser = (userId, event, payload) => {
    const sockets = onlineUsers.get(userId.toString());
    if (!sockets) return;
    for (const sid of sockets) io.to(sid).emit(event, payload);
  };

  // Disappearing messages: once the receiver has READ a message AND the sender has
  // SEEN that it was read, delete it from the database and tell both screens.
  const vanishSeenMessages = async (userA, userB) => {
    const done = await Message.find({
      $or: [
        { sender: userA, receiver: userB },
        { sender: userB, receiver: userA }
      ],
      readAt: { $ne: null },
      senderSeenAt: { $ne: null }
    }).select('_id').lean();

    if (!done.length) return;
    const ids = done.map((m) => m._id);
    await Message.deleteMany({ _id: { $in: ids } });
    const payload = { ids: ids.map((id) => id.toString()) };
    emitToUser(userA, 'messages_vanish', payload);
    emitToUser(userB, 'messages_vanish', payload);
  };

  io.on('connection', async (socket) => {
    const currentUserId = socket.user._id.toString();

    // 1. Register socket in onlineUsers Map
    const existingSockets = onlineUsers.get(currentUserId) || new Set();
    const isFirstConnection = existingSockets.size === 0;
    existingSockets.add(socket.id);
    onlineUsers.set(currentUserId, existingSockets);

    // 2. Identify partner (looked up fresh each time, since partner may register later)
    const getPartnerId = async () => {
      const p = await User.findOne({ _id: { $ne: socket.user._id } }).select('_id');
      return p ? p._id.toString() : null;
    };
    // Lets the client ask for the partner's status AFTER its listeners are attached
    socket.on('get_partner_status', async () => {
      const pid = await getPartnerId();
      if (!pid) return;
      const sockets = onlineUsers.get(pid);
      socket.emit('user_status', {
        userId: pid,
        status: sockets && sockets.size > 0 ? 'online' : 'offline'
      });
    });

    // 5. Handle `send_message` event
    socket.on('send_message', async (data) => {
      try {
        const text = data?.text;
        const clientMessageId = data?.clientMessageId;

        // Validation: Text must be non-empty and <= 2000 characters
        if (!text || typeof text !== 'string' || !text.trim()) {
          socket.emit('message_error', {
            error: 'Validation Error',
            message: 'Message cannot be empty.'
          });
          return;
        }

        const trimmedText = text.trim();
        if (trimmedText.length > 2000) {
          socket.emit('message_error', {
            error: 'Validation Error',
            message: 'Message text exceeds the maximum limit of 2000 characters.'
          });
          return;
        }

        // Idempotency: ignore a clientMessageId we've already processed
        if (clientMessageId) {
          const idsSet = recentMessageIds.get(currentUserId) || new Set();
          if (idsSet.has(clientMessageId)) return;
          idsSet.add(clientMessageId);
          if (idsSet.size > 200) idsSet.delete(idsSet.values().next().value);
          recentMessageIds.set(currentUserId, idsSet);
        }

        // Verify partner exists in database
        const freshPartner = await User.findOne({ _id: { $ne: socket.user._id } });
        if (!freshPartner) {
          socket.emit('message_error', {
            error: 'Partner Missing',
            message: 'Cannot send message: Your partner has not registered yet.'
          });
          return;
        }

        // Delivered = the partner has the app open (connected) right now
        const partnerOnline = (onlineUsers.get(freshPartner._id.toString())?.size || 0) > 0;

        // Store message in MongoDB Atlas
        const savedMessage = await Message.create({
          sender: socket.user._id,
          receiver: freshPartner._id,
          text: trimmedText,
          ...(partnerOnline ? { deliveredAt: new Date() } : {}),
          ...(clientMessageId ? { clientMessageId } : {})
        });

        const messagePayload = {
          _id: savedMessage._id,
          sender: savedMessage.sender,
          receiver: savedMessage.receiver,
          text: savedMessage.text,
          createdAt: savedMessage.createdAt,
          deliveredAt: savedMessage.deliveredAt || null,
          readAt: null,
          clientMessageId
        };

        // Emit `new_message` to all active tabs of the sender
        const senderSockets = onlineUsers.get(currentUserId);
        if (senderSockets) {
          for (const sid of senderSockets) {
            io.to(sid).emit('new_message', messagePayload);
          }
        }

        // Emit `new_message` to all active tabs of the partner
        const partnerSockets = onlineUsers.get(freshPartner._id.toString());
        if (partnerSockets && partnerSockets.size > 0) {
          for (const sid of partnerSockets) {
            io.to(sid).emit('new_message', messagePayload);
          }
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('message_error', {
          error: 'Server Error',
          message: 'Failed to process message. Please try again.'
        });
      }
    });

    // Receiver opened the chat and saw the partner's unread messages
    socket.on('mark_read', async () => {
      try {
        const pid = await getPartnerId();
        if (!pid) return;
        const unread = await Message.find({
          sender: pid,
          receiver: currentUserId,
          readAt: null
        }).select('_id').lean();

        if (unread.length) {
          const ids = unread.map((m) => m._id);
          await Message.updateMany({ _id: { $in: ids } }, { $set: { readAt: new Date() } });
          emitToUser(pid, 'messages_status', { ids: ids.map(String), status: 'read' });
        }
        await vanishSeenMessages(currentUserId, pid);
      } catch (err) {
        console.error('Socket mark_read error:', err.message);
      }
    });

    // Sender saw that their messages were read -> they can now vanish
    socket.on('ack_read', async () => {
      try {
        const pid = await getPartnerId();
        if (!pid) return;
        await Message.updateMany(
          { sender: currentUserId, receiver: pid, readAt: { $ne: null }, senderSeenAt: null },
          { $set: { senderSeenAt: new Date() } }
        );
        await vanishSeenMessages(currentUserId, pid);
      } catch (err) {
        console.error('Socket ack_read error:', err.message);
      }
    });

    // 6. Handle `typing` event
    socket.on('typing', async () => {
      const pid = await getPartnerId();
      if (!pid) return;
      const partnerSockets = onlineUsers.get(pid);
      if (partnerSockets && partnerSockets.size > 0) {
        for (const sid of partnerSockets) {
          io.to(sid).emit('typing', { userId: currentUserId });
        }
      }
    });

    // 7. Handle `stop_typing` event
    socket.on('stop_typing', async () => {
      const pid = await getPartnerId();
      if (!pid) return;
      const partnerSockets = onlineUsers.get(pid);
      if (partnerSockets && partnerSockets.size > 0) {
        for (const sid of partnerSockets) {
          io.to(sid).emit('stop_typing', { userId: currentUserId });
        }
      }
    });

    // 8. Handle `disconnect` (multi-tab safe presence)
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(currentUserId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If user has closed all tabs/connections
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);

          // Broadcast offline presence only to partner
          const pid = await getPartnerId();
          if (pid) {
            const partnerSockets = onlineUsers.get(pid);
            if (partnerSockets && partnerSockets.size > 0) {
              for (const sid of partnerSockets) {
                io.to(sid).emit('user_status', {
                  userId: currentUserId,
                  status: 'offline'
                });
              }
            }
          }
        }
      }
    });

    // Announce presence AFTER all listeners above are registered (no await before them,
    // otherwise events sent by the client right after connecting would be dropped)
    const partnerIdStr = await getPartnerId();
    // 3. Notify partner of online presence if this is user's first active tab
    if (isFirstConnection && partnerIdStr) {
      const partnerSockets = onlineUsers.get(partnerIdStr);
      if (partnerSockets && partnerSockets.size > 0) {
        for (const sid of partnerSockets) {
          io.to(sid).emit('user_status', {
            userId: currentUserId,
            status: 'online'
          });
        }
      }
    }

    // Messages that were waiting for me are now delivered -> update sender's ticks
    if (partnerIdStr) {
      const waiting = await Message.find({
        sender: partnerIdStr,
        receiver: currentUserId,
        deliveredAt: null
      }).select('_id').lean();
      if (waiting.length) {
        const ids = waiting.map((m) => m._id);
        await Message.updateMany({ _id: { $in: ids } }, { $set: { deliveredAt: new Date() } });
        emitToUser(partnerIdStr, 'messages_status', { ids: ids.map(String), status: 'delivered' });
      }
    }

    // 4. Send partner's current presence status back to newly connected socket
    if (partnerIdStr) {
      const partnerSockets = onlineUsers.get(partnerIdStr);
      const isPartnerOnline = partnerSockets && partnerSockets.size > 0;
      socket.emit('user_status', {
        userId: partnerIdStr,
        status: isPartnerOnline ? 'online' : 'offline'
      });
    }
  });
};