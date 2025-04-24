/**
 * Authentication service for handling login, logout, and token management
 */

// API endpoints
const API_URL = '/api/auth';
const LOGIN_URL = `${API_URL}/login`;
const REGISTER_URL = `${API_URL}/register`;
const LOGOUT_URL = `${API_URL}/logout`;
const REFRESH_TOKEN_URL = `${API_URL}/refresh-token`;

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data and tokens
 */
export const login = async (email, password) => {
  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  // Store token and user info
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration result
 */
export const register = async (userData) => {
  const response = await fetch(REGISTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data;
};

/**
 * Logout user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  const token = localStorage.getItem('token');

  if (token) {
    try {
      await fetch(LOGOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Clear local storage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Get current user from local storage
 * @returns {Object|null} - User data or null if not logged in
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Get authentication token from local storage
 * @returns {string|null} - Token or null if not logged in
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Refresh authentication token
 * @returns {Promise<Object>} - New tokens
 */
export const refreshToken = async () => {
  const response = await fetch(REFRESH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for refresh token
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Token refresh failed');
  }

  // Update token in local storage
  localStorage.setItem('token', data.accessToken);

  return data;
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  getToken,
  isAuthenticated,
  refreshToken,
};
