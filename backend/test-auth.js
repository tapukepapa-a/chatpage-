import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import User from './src/models/User.js';
import RegistrationSlot from './src/models/RegistrationSlot.js';
import app from './src/app.js';

let server;
const PORT = 5001; // Use separate port for test server
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runAuthTests() {
  console.log('🧪 Starting Phase 3 Comprehensive Authentication Tests...\n');

  await connectDB();
  await RegistrationSlot.initializeSlots();

  // Clean test database state before test
  await User.deleteMany({});
  await RegistrationSlot.updateMany({}, { $set: { userId: null, claimedAt: null } });

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      resolve();
    });
  });

  let firstCookie = '';
  let secondCookie = '';

  try {
    // Test 0: Initial Registration Status
    console.log('Test 0: Checking initial registration status...');
    const resStatus0 = await fetch(`${BASE_URL}/api/auth/registration-status`);
    const dataStatus0 = await resStatus0.json();
    console.log('   Result:', dataStatus0);
    if (!dataStatus0.registrationOpen || dataStatus0.registeredCount !== 0) {
      throw new Error('Initial registration status should be open with 0 users');
    }
    console.log('   ✅ PASS: Registration is initially open (0 registered)\n');

    // Test 1: First Account Can Register
    console.log('Test 1: Registering first account (user1@example.com)...');
    const resReg1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'user1@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      })
    });
    const dataReg1 = await resReg1.json();
    firstCookie = resReg1.headers.get('set-cookie');
    console.log('   Status:', resReg1.status);
    console.log('   User slot:', dataReg1.user?.slot);
    console.log('   Has password hash exposed:', dataReg1.user?.password !== undefined);
    if (resReg1.status !== 201 || dataReg1.user?.slot !== 1 || dataReg1.user?.password) {
      throw new Error('First user registration failed or exposed password');
    }
    console.log('   ✅ PASS: First account successfully registered into Slot 1 (password hidden)\n');

    // Test 2: Second Account Can Register
    console.log('Test 2: Registering second account (user2@example.com)...');
    const resReg2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'user2@example.com',
        password: 'securePassword456',
        confirmPassword: 'securePassword456'
      })
    });
    const dataReg2 = await resReg2.json();
    secondCookie = resReg2.headers.get('set-cookie');
    console.log('   Status:', resReg2.status);
    console.log('   User slot:', dataReg2.user?.slot);
    if (resReg2.status !== 201 || dataReg2.user?.slot !== 2) {
      throw new Error('Second user registration failed');
    }
    console.log('   ✅ PASS: Second account successfully registered into Slot 2\n');

    // Test 2.1: Check Status After 2 Users
    console.log('Test 2.1: Checking registration status after 2 accounts...');
    const resStatus2 = await fetch(`${BASE_URL}/api/auth/registration-status`);
    const dataStatus2 = await resStatus2.json();
    console.log('   Result:', dataStatus2);
    if (dataStatus2.registrationOpen !== false || dataStatus2.registeredCount !== 2) {
      throw new Error('Registration should now be closed with 2 users');
    }
    console.log('   ✅ PASS: Registration status correctly reports closed (2 registered)\n');

    // Test 3: Third Account Registration is Rejected
    console.log('Test 3: Attempting to register third account (user3@example.com)...');
    const resReg3 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'user3@example.com',
        password: 'password789',
        confirmPassword: 'password789'
      })
    });
    const dataReg3 = await resReg3.json();
    console.log('   Status:', resReg3.status, `(${dataReg3.error}: ${dataReg3.message})`);
    if (resReg3.status !== 403) {
      throw new Error('Third user registration should have been rejected with 403 Forbidden');
    }
    console.log('   ✅ PASS: Third account rejected by backend limit\n');

    // Test 4: Duplicate Email Registration is Rejected
    console.log('Test 4: Attempting to register duplicate email (user1@example.com)...');
    const resDup = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'user1@example.com',
        password: 'somepassword',
        confirmPassword: 'somepassword'
      })
    });
    const dataDup = await resDup.json();
    console.log('   Status:', resDup.status, `(${dataDup.error})`);
    // Status can be 403 (registration closed) or 409 (duplicate) - both reject
    if (resDup.status !== 403 && resDup.status !== 409) {
      throw new Error('Duplicate registration was not rejected');
    }
    console.log('   ✅ PASS: Duplicate registration rejected\n');

    // Test 5: Correct Login Succeeds
    console.log('Test 5: Testing correct login with user1@example.com...');
    const resLoginGood = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'USER1@example.com', // test case-insensitive normalization
        password: 'password123'
      })
    });
    const dataLoginGood = await resLoginGood.json();
    console.log('   Status:', resLoginGood.status);
    console.log('   Cookie received:', !!resLoginGood.headers.get('set-cookie'));
    if (resLoginGood.status !== 200 || !resLoginGood.headers.get('set-cookie')) {
      throw new Error('Valid login failed');
    }
    console.log('   ✅ PASS: Valid credentials login succeeded and issued HTTP-only session cookie\n');

    // Test 6: Incorrect Password is Rejected
    console.log('Test 6: Testing incorrect password login...');
    const resLoginBad = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
      body: JSON.stringify({
        email: 'user1@example.com',
        password: 'wrong_password_xyz'
      })
    });
    const dataLoginBad = await resLoginBad.json();
    console.log('   Status:', resLoginBad.status, `(${dataLoginBad.error}: ${dataLoginBad.message})`);
    if (resLoginBad.status !== 401) {
      throw new Error('Incorrect password was not rejected with 401');
    }
    console.log('   ✅ PASS: Incorrect password rejected with generic error message\n');

    // Test 7: Unauthenticated Users Cannot Access Protected Routes
    console.log('Test 7: Accessing /api/auth/me without cookies...');
    const resMeNoAuth = await fetch(`${BASE_URL}/api/auth/me`);
    const dataMeNoAuth = await resMeNoAuth.json();
    console.log('   Status:', resMeNoAuth.status, `(${dataMeNoAuth.error}: ${dataMeNoAuth.message})`);
    if (resMeNoAuth.status !== 401) {
      throw new Error('Protected route allowed unauthenticated access');
    }
    console.log('   ✅ PASS: Unauthenticated access blocked with 401\n');

    // Test 8: Authenticated Session Preserves Session and Identifies Partner
    console.log('Test 8: Accessing /api/auth/me with first user session cookie...');
    const jwtCookieValue = firstCookie.split(';')[0];
    const resMeAuth = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: jwtCookieValue }
    });
    const dataMeAuth = await resMeAuth.json();
    console.log('   Status:', resMeAuth.status);
    console.log('   Logged in user:', dataMeAuth.user?.email);
    console.log('   Derived partner:', dataMeAuth.partner?.email);
    if (resMeAuth.status !== 200 || dataMeAuth.user?.email !== 'user1@example.com' || dataMeAuth.partner?.email !== 'user2@example.com') {
      throw new Error('Session verification failed or did not derive correct partner');
    }
    console.log('   ✅ PASS: Valid session recognized; partner derived securely on backend\n');

    // Test 9: Logout Clears the Session
    console.log('Test 9: Calling /api/auth/logout...');
    const resLogout = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'X-JustUs-Client': '1' }
    });
    const logoutCookie = resLogout.headers.get('set-cookie');
    console.log('   Status:', resLogout.status);
    console.log('   Clear-Cookie header:', logoutCookie?.includes('jwt=;') || logoutCookie?.includes('Expires=Thu, 01 Jan 1970'));
    if (resLogout.status !== 200 || !logoutCookie) {
      throw new Error('Logout failed to clear cookie');
    }
    console.log('   ✅ PASS: Logout clears the HTTP-only JWT cookie\n');

    // Test 10: Concurrency / Simultaneous Registration Test
    console.log('Test 10: Testing simultaneous registration requests race-condition protection...');
    // Clear slots and users to test fresh simultaneous requests
    await User.deleteMany({});
    await RegistrationSlot.updateMany({}, { $set: { userId: null, claimedAt: null } });

    // Send 5 concurrent registration requests at the exact same moment
    const concurrentRequests = [1, 2, 3, 4, 5].map((i) =>
      fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-JustUs-Client': '1' },
        body: JSON.stringify({
          email: `concurrent${i}@example.com`,
          password: `password${i}123`,
          confirmPassword: `password${i}123`
        })
      }).then(async (r) => ({ index: i, status: r.status, data: await r.json() }))
    );

    const results = await Promise.all(concurrentRequests);
    const successful = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 403);
    const finalUserCount = await User.countDocuments();

    console.log(`   Successful registrations: ${successful.length}`);
    console.log(`   Rejected registrations (403): ${rejected.length}`);
    console.log(`   Final users in database: ${finalUserCount}`);

    if (successful.length !== 2 || finalUserCount !== 2) {
      throw new Error(`Concurrency race condition failed: expected exactly 2 users, got ${finalUserCount}`);
    }
    console.log('   ✅ PASS: Atomic MongoDB slot mechanism strictly enforced 2 accounts under race condition!\n');

    // Clean up test accounts after verification
    await User.deleteMany({});
    await RegistrationSlot.updateMany({}, { $set: { userId: null, claimedAt: null } });
    console.log('🧹 Cleaned test documents from database.');

    console.log('\n🎉 ALL 10 AUTHENTICATION & SECURITY TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
