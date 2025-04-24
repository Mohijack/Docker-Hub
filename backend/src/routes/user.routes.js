const express = require('express');
const router = express.Router();
const { User } = require('../models/mongoose');
const { authenticateToken } = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User is already attached to req by authenticateToken middleware
    res.json(req.user);
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, company } = req.body;
    
    // Update only allowed fields
    if (name) req.user.name = name;
    if (company !== undefined) req.user.company = company;
    
    // Save updated user
    await req.user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: req.user
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

/**
 * @route   GET /api/users/me/services
 * @desc    Get current user's services
 * @access  Private
 */
router.get('/me/services', authenticateToken, async (req, res) => {
  try {
    res.json(req.user.services);
  } catch (error) {
    logger.error('Get user services error:', error);
    res.status(500).json({ error: 'Failed to get user services' });
  }
});

module.exports = router;
