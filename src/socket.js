import { io } from 'socket.io-client';

// Create a singleton socket instance using Vite's proxy for Socket.IO.
// The client connects to the same origin (frontend) and Vite proxies '/socket.io' to the backend.
const socket = io(window.location.origin, {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket'] // Force WebSocket for reliability.
});

// Log connection errors for debugging.
socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
});
// Export the socket so components can import and use it.
export default socket;
