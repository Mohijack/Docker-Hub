const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const { logger } = require('../utils/logger');
const { User } = require('../models/mongoose');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);

      // Check if token requires 2FA
      if (decoded.require2FA) {
        return res.status(403).json({
          error: 'Two-factor authentication required',
          require2FA: true
        });
      }

      // Find user
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          tokenExpired: true
        });
      }

      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Admin role middleware
 * Ensures user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Role middleware
 * Ensures user has one of the specified roles
 * @param {Array} roles - Array of allowed roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};

/**
 * Permission middleware
 * Ensures user has the specified permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  const { roleHasPermission } = require('../utils/permissions');

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has the required permission based on their role
    if (!roleHasPermission(req.user.role, permission)) {
      // Check if user has the permission explicitly assigned
      if (!req.user.permissions || !req.user.permissions.includes(permission)) {
        return res.status(403).json({
          error: 'Permission denied',
          message: `This action requires the '${permission}' permission`
        });
      }
    }

    next();
  };
};

/**
 * Refresh token middleware
 * Validates refresh token
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Find user with this refresh token
    const user = await User.findOne({
      'refreshTokens.token': refreshToken,
      'refreshTokens.expires': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Add user and refresh token to request
    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    logger.error('Refresh token validation error:', error);
    return res.status(500).json({ error: 'Refresh token validation failed' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  validateRefreshToken
};
