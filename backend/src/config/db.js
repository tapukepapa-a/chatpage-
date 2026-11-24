import mongoose from 'mongoose';

/**
 * Sanitizes connection strings to ensure credentials are never leaked in logs
 */
const sanitizeMessage = (msg) => {
  if (typeof msg !== 'string') return msg;
  return msg.replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://***:***@');
};

/**
 * Connect to MongoDB Atlas via Mongoose with comprehensive error handling
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || /<.*>/i.test(uri)) {
    console.warn('\n⚠️ [Database Warning] MONGODB_URI is not configured with valid Atlas credentials in backend/.env.');
    console.warn('   Please set your MongoDB Atlas password in backend/.env or run the configuration prompt.\n');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'justus',
      serverSelectionTimeoutMS: 6000, // Timeout after 6s for fast diagnostic feedback
    });

    console.log(`✅ [Database] MongoDB Atlas Connected successfully: ${conn.connection.host}`);
    console.log(`   Database Name: ${conn.connection.name}`);

    // Register connection lifecycle event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ [Database Error] Runtime connection error: ${sanitizeMessage(err.message)}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [Database] Disconnected from MongoDB Atlas.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 [Database] Reconnected to MongoDB Atlas.');
    });

    return true;
  } catch (error) {
    const sanitizedError = sanitizeMessage(error.message);
    console.error(`❌ [Database Connection Failed] ${sanitizedError}`);

    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error('   👉 Reason: Authentication failed. Please verify the database username and password in backend/.env.');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('   👉 Reason: Cluster selection timed out. Please check:');
      console.error('      1. Network Access in MongoDB Atlas (ensure your IP or 0.0.0.0/0 is whitelisted).');
      console.error('      2. Internet connection / DNS resolution.');
    } else {
      console.error('   👉 Please check network access, IP whitelist in Atlas, and credentials.');
    }

    return false;
  }
};

/**
 * Check current database connection status
 */
export const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };

  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    status: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

export default connectDB;
