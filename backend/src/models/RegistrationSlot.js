import mongoose from 'mongoose';

/**
 * RegistrationSlot Schema
 * Enforces an atomic, database-level 2-account registration limit.
 * Exactly two slots exist: 1 and 2.
 * Slots can only be claimed atomically via findOneAndUpdate.
 */
const registrationSlotSchema = new mongoose.Schema(
  {
    slot: {
      type: Number,
      required: true,
      unique: true,
      enum: [1, 2]
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    claimedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: false
  }
);

/**
 * Ensure slot documents (1 and 2) exist in MongoDB.
 * Called automatically during database initialization.
 */
registrationSlotSchema.statics.initializeSlots = async function () {
  await this.updateOne(
    { slot: 1 },
    { $setOnInsert: { slot: 1, userId: null, claimedAt: null } },
    { upsert: true }
  );
  await this.updateOne(
    { slot: 2 },
    { $setOnInsert: { slot: 2, userId: null, claimedAt: null } },
    { upsert: true }
  );
};

/**
 * Atomically claims an available slot (1 or 2).
 * Returns the claimed slot document or null if all slots are taken.
 */
registrationSlotSchema.statics.claimSlot = async function (reservationId) {
  await this.initializeSlots();

  return await this.findOneAndUpdate(
    { userId: null },
    {
      $set: {
        userId: reservationId,
        claimedAt: new Date()
      }
    },
    {
      new: true,
      sort: { slot: 1 }
    }
  );
};

/**
 * Releases a reserved slot if user creation failed (e.g. duplicate email or validation error).
 */
registrationSlotSchema.statics.releaseSlot = async function (slotNumber, reservationId) {
  await this.updateOne(
    { slot: slotNumber, userId: reservationId },
    {
      $set: {
        userId: null,
        claimedAt: null
      }
    }
  );
};

/**
 * Finalizes the slot with the real newly created User _id.
 */
registrationSlotSchema.statics.confirmSlot = async function (slotNumber, finalUserId) {
  await this.updateOne(
    { slot: slotNumber },
    {
      $set: {
        userId: finalUserId,
        claimedAt: new Date()
      }
    }
  );
};

/**
 * Returns current registration availability without exposing sensitive data.
 */
registrationSlotSchema.statics.getRegistrationStatus = async function () {
  await this.initializeSlots();
  const claimedCount = await this.countDocuments({ userId: { $ne: null } });

  return {
    registrationOpen: claimedCount < 2,
    registeredCount: claimedCount
  };
};

const RegistrationSlot = mongoose.model('RegistrationSlot', registrationSlotSchema);

export default RegistrationSlot;
