# Just Us — Backend Service (Phase 3 Authentication)

Node.js + Express backend service connected to MongoDB Atlas (`Cluster0`) via Mongoose. Features secure JWT authentication stored in HTTP-only cookies, atomic 2-account registration limit, bcrypt password hashing, and rate limiting.

---

## 📁 Backend Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js            # MongoDB Atlas connection manager & credential-safe logging
│   ├── models/
│   │   ├── User.js          # User Mongoose model (email, hashed password, slot, createdAt)
│   │   ├── Message.js       # Message Mongoose model (sender, receiver, text, createdAt)
│   │   └── RegistrationSlot.js # Atomic 2-account registration limit enforcer
│   ├── middleware/
│   │   └── authMiddleware.js # JWT cookie verification, CSRF guard & rate limiter
│   ├── controllers/
│   │   └── authController.js # Register, login, getMe, logout, registration status
│   ├── routes/
│   │   ├── authRoutes.js    # Authentication API endpoints
│   │   └── healthRoutes.js  # GET /api/health endpoint
│   ├── app.js               # Express application configuration & middleware
│   └── server.js            # Server entry point & graceful shutdown
├── .env                     # Private environment configuration (ignored by git)
├── .env.example             # Template for required environment variables
├── .gitignore               # Ignores node_modules, .env, and logs
├── package.json             # Backend dependencies and scripts
├── configure-db.js          # Interactive & secure terminal setup for MongoDB Atlas password
├── test-models.js           # Verification test script for models & schemas
├── test-auth.js             # Comprehensive test suite for Phase 3 Auth & Limits
└── README.md                # Documentation and setup instructions
```

---

## 🔒 Authentication & Security Architecture

1. **Atomic 2-Account Registration Limit**:
   - Backed by MongoDB atomic `findOneAndUpdate` on dedicated slot documents (`slot: 1` and `slot: 2`).
   - Concurrency race-condition safe: a third registration is permanently rejected with `403 Forbidden`.
   - `User.slot` carries a unique index with `enum: [1, 2]`.

2. **Password Security**:
   - Hashed using `bcryptjs` with salt work factor 12 before saving.
   - Plain-text passwords and hashes are never stored or exposed in API responses (`toJSON()` transform excludes `password`).

3. **HTTP-Only Cookie Sessions**:
   - JWT tokens signed with a 64-byte secret key and stored strictly in HTTP-only cookies (`jwt`).
   - Tokens are never stored in `localStorage` or `sessionStorage`.
   - Cookie settings: `httpOnly: true`, `sameSite: 'lax'` (development) / `'none'` (production), `secure: true` (production).

4. **CSRF & Rate Limiting**:
   - Origin/Referer verification and custom header (`X-JustUs-Client`) required on state-changing requests.
   - Rate limited to 15 authentication requests per 15 minutes per IP (`authLimiter`).

5. **Two-Account Privacy Enforcer**:
   - The logged-in user is derived purely from the verified JWT cookie session.
   - `GET /api/auth/me` automatically derives and returns the couple's partner document without relying on client-supplied IDs.

---

## 📡 API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Public | Server health & database connection status |
| `GET` | `/api/auth/registration-status` | Public | Returns `{ registrationOpen, registeredCount }` |
| `POST` | `/api/auth/register` | Public (limit: 2) | Registers account (email, password, confirmPassword) |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and sets HTTP-only cookie |
| `GET` | `/api/auth/me` | Protected | Returns authenticated user and partner details |
| `POST` | `/api/auth/logout` | Public | Clears session cookie |

---

## 🚀 Running and Testing

### 1. Run All Tests
```bash
# Model validation test
npm test --prefix backend

# Phase 3 Full Authentication & 2-Account Limit Test Suite
npm run test:auth --prefix backend
```

### 2. Start Backend in Development Mode
```bash
npm run dev --prefix backend
```
*(Server listens on `http://localhost:5000`)*
