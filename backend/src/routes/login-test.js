const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

/**
 * Simple login endpoint for testing
 */
router.post('/login', (req, res) => {
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
    
    // Check if email and password match the admin credentials
    if (email === 'admin@beyondfire.cloud' && password === 'AdminPW!') {
      // Generate a simple token
      const token = 'test-token-' + Date.now();
      
      logger.info('Login successful', { email, clientIp, xForwardedFor });
      
      return res.json({
        message: 'Login successful',
        user: {
          email,
          name: 'Admin',
          role: 'admin'
        },
        accessToken: token
      });
    }
    
    // If credentials don't match, return error
    logger.warn('Login failed - Invalid credentials', { email, clientIp, xForwardedFor });
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
