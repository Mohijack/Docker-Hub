const express = require('express');
const router = express.Router();
const { User, Booking, Service } = require('../models/mongoose');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const deploymentService = require('../services/deployment');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-refreshTokens');
    res.json(users);
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-refreshTokens');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Admin get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, company, role } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (company !== undefined) user.company = company;
    if (role && ['user', 'admin'].includes(role)) user.role = role;
    
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin
 */
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate a random password
    const newPassword = Math.random().toString(36).substring(2, 10) + 'A1!';
    
    // Update password
    user.password = newPassword;
    
    // Invalidate all refresh tokens
    user.refreshTokens = [];
    
    await user.save();
    
    res.json({
      message: 'Password reset successfully',
      newPassword
    });
  } catch (error) {
    logger.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings
 * @access  Admin
 */
router.get('/bookings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('userId', 'name email');
    res.json(bookings);
  } catch (error) {
    logger.error('Admin get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    Get booking by ID
 * @access  Admin
 */
router.get('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId', 'name email');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    logger.error('Admin get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Update booking
 * @access  Admin
 */
router.put('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { customName, status } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update fields
    if (customName) booking.customName = customName;
    if (status && ['pending', 'deploying', 'active', 'suspended', 'failed', 'deleted'].includes(status)) {
      booking.status = status;
      booking.addDeploymentLog(`Status updated to ${status} by admin`, 'info');
    }
    
    await booking.save();
    
    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    logger.error('Admin update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/deploy
 * @desc    Deploy a booking
 * @access  Admin
 */
router.post('/bookings/:id/deploy', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update booking status
    booking.status = 'deploying';
    booking.addDeploymentLog('Deployment started by admin', 'info');
    await booking.save();
    
    // Deploy service (this will be handled asynchronously)
    deploymentService.deployService(booking._id)
      .then(result => {
        logger.info(`Deployment result for booking ${booking._id}:`, result);
      })
      .catch(error => {
        logger.error(`Deployment error for booking ${booking._id}:`, error);
      });
    
    res.json({
      message: 'Deployment started',
      booking
    });
  } catch (error) {
    logger.error('Admin deploy booking error:', error);
    res.status(500).json({ error: 'Failed to deploy booking' });
  }
});

/**
 * @route   POST /api/admin/bookings/:id/stop
 * @desc    Stop a booking
 * @access  Admin
 */
router.post('/bookings/:id/stop', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Stop service
    const result = await deploymentService.stopService(booking._id);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to stop service' });
    }
    
    // Update booking status
    booking.status = 'suspended';
    booking.addDeploymentLog('Service stopped by admin', 'info');
    await booking.save();
    
    res.json({
      message: 'Service stopped successfully',
      booking
    });
  } catch (error) {
    logger.error('Admin stop booking error:', error);
    res.status(500).json({ error: 'Failed to stop booking' });
  }
});

/**
 * @route   DELETE /api/admin/bookings/:id
 * @desc    Delete a booking
 * @access  Admin
 */
router.delete('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if booking is active
    if (booking.status === 'active') {
      // Stop the service first
      const result = await deploymentService.stopService(booking._id);
      
      if (!result.success) {
        return res.status(400).json({ error: 'Failed to stop service' });
      }
    }
    
    // Update booking status
    booking.status = 'deleted';
    booking.addDeploymentLog('Booking deleted by admin', 'info');
    await booking.save();
    
    // Remove service from user
    const user = await User.findById(booking.userId);
    if (user) {
      user.services = user.services.filter(service => service.id.toString() !== booking._id.toString());
      await user.save();
    }
    
    res.json({
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    logger.error('Admin delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

/**
 * @route   GET /api/admin/services
 * @desc    Get all services
 * @access  Admin
 */
router.get('/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    logger.error('Admin get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

/**
 * @route   POST /api/admin/services
 * @desc    Create a new service
 * @access  Admin
 */
router.post('/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, name, description, price, image, resources, composeTemplate } = req.body;
    
    // Validate input
    if (!id || !name || !description || !price || !image || !resources || !composeTemplate) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if service already exists
    const existingService = await Service.findOne({ id });
    
    if (existingService) {
      return res.status(400).json({ error: 'Service with this ID already exists' });
    }
    
    // Create service
    const service = new Service({
      id,
      name,
      description,
      price,
      image,
      resources,
      composeTemplate,
      active: true
    });
    
    await service.save();
    
    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    logger.error('Admin create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

/**
 * @route   PUT /api/admin/services/:id
 * @desc    Update a service
 * @access  Admin
 */
router.put('/services/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, image, resources, composeTemplate, active } = req.body;
    
    const service = await Service.findOne({ id: req.params.id });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Update fields
    if (name) service.name = name;
    if (description) service.description = description;
    if (price !== undefined) service.price = price;
    if (image) service.image = image;
    if (resources) service.resources = resources;
    if (composeTemplate) service.composeTemplate = composeTemplate;
    if (active !== undefined) service.active = active;
    
    await service.save();
    
    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    logger.error('Admin update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * @route   GET /api/admin/logs
 * @desc    Get system logs
 * @access  Admin
 */
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level, limit = 100, skip = 0 } = req.query;
    
    // Query MongoDB logs collection
    const db = mongoose.connection.db;
    const logsCollection = db.collection('logs');
    
    // Build query
    const query = {};
    if (level) {
      query.level = level;
    }
    
    // Get logs
    const logs = await logsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();
    
    res.json(logs);
  } catch (error) {
    logger.error('Admin get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

module.exports = router;
