const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/setup/status
 * @desc    Check if setup is required
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const result = await authService.checkUsersExist();
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    return res.json({
      setupRequired: !result.usersExist,
      userCount: result.count
    });
  } catch (error) {
    logger.error('Setup status check error:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

/**
 * @route   POST /api/setup/admin
 * @desc    Setup initial admin user
 * @access  Public
 */
router.post('/admin', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;
    
    // Simple validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    const result = await authService.setupInitialAdmin({ email, password, name, company });
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    logger.info('Initial admin setup completed successfully');
    
    res.status(201).json({
      message: 'Setup completed successfully',
      user: result.user
    });
  } catch (error) {
    logger.error('Setup admin error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

module.exports = router;
