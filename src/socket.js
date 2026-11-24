import { io } from 'socket.io-client';

// Where the Socket.IO server lives.
// - Same origin (dev proxy, or backend serving the frontend): leave VITE_SOCKET_URL empty.
// - Frontend on Vercel, backend on Render: set VITE_SOCKET_URL to the Render address.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const socket = io(SOCKET_URL, {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket'],
  // Fetch a fresh short-lived token on every connect / reconnect attempt.
  // '/api/...' goes through the same-origin proxy (Vercel rewrite or Vite proxy),
  // so the session cookie is sent normally.
  auth: async (cb) => {
    try {
      const res = await fetch('/api/auth/socket-token', {
        credentials: 'include',
        headers: { 'X-JustUs-Client': '1' }
      });
      if (!res.ok) return cb({});
      const data = await res.json();
      cb({ token: data.token });
    } catch {
      cb({});
    }
  }
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

export default socket;