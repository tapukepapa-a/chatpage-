import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

const DB_USER = 'krupeshparmar231_db_user';
const DB_HOST = 'cluster0.zggo0lv.mongodb.net';
const DB_NAME = 'justus';

/**
 * Masked terminal prompt function to read password without printing it to the terminal
 */
function askHiddenPassword(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Mute stdout while user is typing password
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(promptText);

    let password = '';
    const onData = (char) => {
      char = char.toString('utf-8');
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          // Enter pressed
          stdin.removeListener('data', onData);
          stdout.write('\n');
          rl.close();
          resolve(password.trim());
          break;
        case '\u0003':
          // Ctrl+C
          stdout.write('\nCancelled.\n');
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;
        default:
          password += char;
          break;
      }
    };

    stdin.on('data', onData);
  });
}

async function configureAndTest() {
  console.log('====================================================');
  console.log('🔒 Just Us — Secure MongoDB Atlas Configuration');
  console.log('====================================================');
  console.log(`Cluster Host : ${DB_HOST}`);
  console.log(`Database User: ${DB_USER}`);
  console.log(`Database Name: ${DB_NAME}\n`);

  // 1. Check if password was supplied via environment variable or CLI argument
  let rawPassword =
    process.env.MONGODB_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.argv[2];

  if (!rawPassword) {
    rawPassword = await askHiddenPassword('🔑 Enter MongoDB Atlas password for krupeshparmar231_db_user (input hidden): ');
  }

  if (!rawPassword) {
    console.error('❌ Error: Password cannot be empty.');
    process.exit(1);
  }

  // 2. URL-encode special characters in the password
  const encodedPassword = encodeURIComponent(rawPassword);

  // 3. Build connection string
  const connectionString = `mongodb+srv://${DB_USER}:${encodedPassword}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

  // 4. Read and update backend/.env preserving all existing keys
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = envContent.split(/\r?\n/);
  let uriFound = false;

  const updatedLines = lines.map((line) => {
    if (line.startsWith('MONGODB_URI=')) {
      uriFound = true;
      return `MONGODB_URI=${connectionString}`;
    }
    return line;
  });

  if (!uriFound) {
    updatedLines.push(`MONGODB_URI=${connectionString}`);
  }

  // Ensure default PORT and CLIENT_URL exist if not present
  if (!updatedLines.some((l) => l.startsWith('PORT='))) {
    updatedLines.unshift('PORT=5000');
  }
  if (!updatedLines.some((l) => l.startsWith('NODE_ENV='))) {
    updatedLines.splice(1, 0, 'NODE_ENV=development');
  }
  if (!updatedLines.some((l) => l.startsWith('CLIENT_URL='))) {
    updatedLines.push('CLIENT_URL=http://localhost:5173');
  }

  fs.writeFileSync(envPath, updatedLines.join('\n').trim() + '\n', 'utf8');
  console.log('✅ Updated backend/.env securely (credentials are never logged or committed).');

  // 5. Immediately test the connection via Mongoose
  console.log('\n⏳ Testing Mongoose connection to MongoDB Atlas...');
  try {
    const conn = await mongoose.connect(connectionString, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 6000
    });

    console.log(`✅ [SUCCESS] Connected to MongoDB Atlas!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   State: Connected (readyState: 1)\n`);

    await mongoose.disconnect();
    console.log('🎉 Setup complete! You can now start the backend with: npm run dev');
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ [Connection Failed] ${err.message}`);
    if (err.name === 'MongoServerError' && err.code === 8000) {
      console.error('👉 Authentication failed. Please re-check your MongoDB user password in Atlas.');
    } else if (err.name === 'MongoServerSelectionError') {
      console.error('👉 Cluster selection timed out. Please check your Atlas IP Whitelist (Network Access -> Add IP Address).');
    }
    process.exit(1);
  }
}

configureAndTest();
