const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

/**
 * Simple login endpoint for testing
 */
router.post('/login', async (req, res) => {
  try {
    // Log client information
    const clientIp = req.ip;
    const xForwardedFor = req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'] || 'Unknown';

    logger.info('Login test route accessed', {
      body: req.body,
      clientIp,
      xForwardedFor,
      userAgent
    });

    // Simple login for testing
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Use MongoDB to authenticate
    try {
      // This is a test route, so we'll use a simple authentication
      // In a real application, we would use the auth service
      const mongoose = require('mongoose');
      const User = mongoose.model('User');

      // Find the user
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        logger.warn('Login failed - User not found', { email, clientIp, xForwardedFor });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        logger.warn('Login failed - Invalid password', { email, clientIp, xForwardedFor });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate a simple token
      const token = 'test-token-' + Date.now();

      logger.info('Login successful', { email, clientIp, xForwardedFor });

      return res.json({
        message: 'Login successful',
        user: {
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken: token
      });
    } catch (dbError) {
      logger.error('Database error during login:', dbError);
      return res.status(500).json({ error: 'Login failed' });
    }

    // This code is unreachable, but we'll keep it as a fallback
    logger.warn('Login failed - Unreachable code', { email, clientIp, xForwardedFor });
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
