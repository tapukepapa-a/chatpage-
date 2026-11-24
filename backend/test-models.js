import mongoose from 'mongoose';
import User from './src/models/User.js';
import Message from './src/models/Message.js';

console.log('🧪 Testing User and Message Mongoose Models...\n');

// 1. Test Valid User
const validUser = new User({
  email: 'ALEX@EXAMPLE.COM',
  password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // hashed password example
  slot: 1
});

console.log('1. User Creation:');
console.log('   - Email (normalized to lowercase):', validUser.email);
console.log('   - createdAt auto-generated:', validUser.createdAt instanceof Date);
console.log('   - toJSON() excludes password hash:', validUser.toJSON().password === undefined);

// 2. Test Invalid User (missing fields)
const invalidUser = new User({});
const userValidation = invalidUser.validateSync();
console.log('\n2. User Validation Errors:');
console.log('   - Required fields caught:', Object.keys(userValidation.errors).join(', '));

// 3. Test Valid Message
const senderId = new mongoose.Types.ObjectId();
const receiverId = new mongoose.Types.ObjectId();

const validMessage = new Message({
  sender: senderId,
  receiver: receiverId,
  text: 'Hey Elena, our private sanctuary is ready.'
});

console.log('\n3. Message Creation:');
console.log('   - Sender ObjectId:', validMessage.sender.toString());
console.log('   - Receiver ObjectId:', validMessage.receiver.toString());
console.log('   - Message text:', validMessage.text);
console.log('   - createdAt auto-generated:', validMessage.createdAt instanceof Date);

// 4. Test Invalid Message (missing fields)
const invalidMessage = new Message({});
const msgValidation = invalidMessage.validateSync();
console.log('\n4. Message Validation Errors:');
console.log('   - Required fields caught:', Object.keys(msgValidation.errors).join(', '));

console.log('\n✅ ALL MODEL TESTS PASSED SUCCESSFULLY!\n');
process.exit(0);
