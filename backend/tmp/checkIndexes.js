import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env' });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const idx = await mongoose.connection.db.collection('messages').indexes();
    console.log('Indexes:', JSON.stringify(idx, null, 2));
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
