/**
 * API client for Just Us authentication endpoints
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-JustUs-Client': '1'
};

/**
 * Check whether registration is currently open and get account count
 */
export async function getRegistrationStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/registration-status`, {
      headers: defaultHeaders,
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to retrieve registration status');
    return await res.json();
  } catch (error) {
    console.error('getRegistrationStatus error:', error);
    return { registrationOpen: true, registeredCount: 0 };
  }
}

/**
 * Register a new user account (up to 2 accounts)
 */
export async function registerUser({ email, password, confirmPassword }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
    body: JSON.stringify({ email, password, confirmPassword })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Registration failed');
  }
  return data;
}

/**
 * Authenticate with registered email and password
 */
export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Authentication failed');
  }
  return data;
}

/**
 * Verify current session cookie and retrieve user and partner info
 */
export async function checkSession() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: defaultHeaders,
    credentials: 'include'
  });

  if (!res.ok) {
    return null;
  }
  return await res.json();
}

/**
 * Clear authentication cookie and destroy session
 */
export async function logoutUser() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('Logout failed');
  }
  return await res.json();
}
