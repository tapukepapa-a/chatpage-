# Just Us — Premium Dark Private Couple Chat (Phase 1, 2 & 3 Complete)

A secure, private sanctuary couple chat application built with **React + Vite** (pure custom CSS, no Tailwind) and **Node.js + Express + MongoDB Atlas**.

---

## 📋 Implementation Status

| Phase | Description | Status |
| :--- | :--- | :---: |
| **Phase 1: Frontend** | Premium dark theme, pure CSS, responsive layout, Login/Register pages, chat interface | ✅ **Complete** |
| **Phase 2: Database & Server** | Node.js + Express backend, Mongoose models, Atlas connection error handling, health check | ✅ **Complete** |
| **Phase 3: Secure Authentication** | Atomic 2-account registration limit, bcrypt hashing, HTTP-only JWT cookies, CSRF guard, rate limiting, session restore & partner auto-pairing | ✅ **Complete** |
| **Phase 4: Realtime Chat & WebSockets** | Socket.IO private rooms & live message synchronization | ⏳ Next Phase |

---

## 🔒 Phase 3 Authentication Specifications

1. **Atomic 2-Account Registration Limit**:
   - Enforced at database level via atomic `RegistrationSlot` allocation.
   - Concurrency race-condition safe: impossible for a 3rd user to register.
   - `GET /api/auth/registration-status` returns `{ registrationOpen, registeredCount }`.
   - When 2 accounts exist, registration is permanently closed and frontend hides/disables registration.

2. **Session Security**:
   - JWT stored strictly in HTTP-only cookies (`jwt`).
   - Zero tokens stored in `localStorage` or `sessionStorage`.
   - `GET /api/auth/me` validates session on page load/refresh.
   - `POST /api/auth/logout` clears session cookie.

3. **Two-Account Privacy Enforcer**:
   - User identity is derived purely from verified JWT cookie.
   - Partner is automatically derived on the backend (`User.findOne({ _id: { $ne: req.user._id } })`).

---

## 🚀 Running the Application

### 1. Start Backend Server (Port 5000)
```bash
npm run server
```

### 2. Start Frontend Dev Server (Port 5173)
```bash
npm run dev
```

### 3. Run Backend Verification Tests
```bash
# Model validation
npm test --prefix backend

# Phase 3 Authentication Test Suite
npm run test:auth --prefix backend
```

### 4. Build Frontend for Production
```bash
npm run build
```
*(Verified: 0 errors, 0 warnings)*
