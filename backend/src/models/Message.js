import mongoose from 'mongoose';

/**
 * Message Schema
 * Contains:
 * - sender: ObjectId referencing the User who sent the message
 * - receiver: ObjectId referencing the User who received the message
 * - text: textual content of the message (max 2000 chars, trimmed)
 * - createdAt: timestamp when message was created
 * - updatedAt: timestamp when message was updated
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required']
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver reference is required']
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message text cannot exceed 2000 characters']
    },
    // Add clientMessageId for idempotency
    clientMessageId: {
      type: String,
      index: true
    },
    // Receipts: ticks + "vanish after both have seen it"
    deliveredAt: { type: Date, default: null }, // receiver's app was online when it arrived
    readAt: { type: Date, default: null },      // receiver opened the chat and saw it
    senderSeenAt: { type: Date, default: null }, // sender saw that it was read
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

// Indexes to query conversation history efficiently between the two accounts
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: 1 });
// Index for idempotent messages – unique per sender when clientMessageId exists
messageSchema.index({ sender: 1, clientMessageId: 1 }, { unique: true, partialFilterExpression: { clientMessageId: { $exists: true } } });

// Auto-delete a message 24 hours after the receiver read it (MongoDB TTL index).
// Messages that are not read yet (readAt = null) are never deleted.
messageSchema.index({ readAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const Message = mongoose.model('Message', messageSchema);

export default Message;