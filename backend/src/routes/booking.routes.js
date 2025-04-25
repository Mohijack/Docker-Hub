const express = require('express');
const router = express.Router();
const { Booking, Service } = require('../models/mongoose');
const { authenticateToken } = require('../middleware/auth.middleware');
const deploymentService = require('../services/deployment');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings for current user
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id });
    res.json({ bookings });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

/**
 * @route   POST /api/bookings
 * @desc    Book a new service
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serviceId, customName, customDomain, licenseInfo } = req.body;

    // Validate input
    if (!serviceId) {
      return res.status(400).json({ error: 'Service ID is required' });
    }

    if (!customName) {
      return res.status(400).json({ error: 'Custom name is required' });
    }

    // Check if service exists
    const service = await Service.findOne({ id: serviceId, active: true });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Generate a unique subdomain if not provided
    let subdomain = customDomain;
    if (!subdomain) {
      // Generate a random subdomain
      const randomString = Math.random().toString(36).substring(2, 8);
      subdomain = `${serviceId}-${randomString}`;
    }

    // Check if domain is already in use
    const domain = `${subdomain}.beyondfire.cloud`;
    const domainExists = await Booking.findOne({ domain });

    if (domainExists) {
      return res.status(400).json({ error: 'Domain is already in use' });
    }

    // Generate a unique port number between 10000 and 20000
    const port = Math.floor(Math.random() * 10000) + 10000;

    // Create booking
    const booking = new Booking({
      userId: req.user._id,
      serviceId,
      serviceName: service.name,
      customName,
      domain,
      port,
      status: 'pending',
      licenseInfo: serviceId === 'fe2-docker' ? {
        email: licenseInfo?.email,
        password: licenseInfo?.password
      } : null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      deploymentLogs: [{
        timestamp: new Date(),
        message: 'Booking created',
        level: 'info'
      }]
    });

    // Save booking
    await booking.save();

    // Add service to user
    req.user.services.push({
      id: booking._id,
      name: booking.customName,
      domain: booking.domain,
      port: booking.port,
      status: 'pending',
      createdAt: booking.createdAt
    });

    await req.user.save();

    res.status(201).json({
      message: 'Service booked successfully',
      booking
    });
  } catch (error) {
    logger.error('Book service error:', error);
    res.status(500).json({ error: 'Failed to book service' });
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    logger.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

/**
 * @route   POST /api/bookings/:id/deploy
 * @desc    Deploy a booked service
 * @access  Private
 */
router.post('/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking is already deployed
    if (booking.status === 'active') {
      return res.status(400).json({ error: 'Service is already deployed' });
    }

    // Update booking status
    booking.status = 'deploying';
    booking.addDeploymentLog('Deployment started', 'info');
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
    logger.error('Deploy service error:', error);
    res.status(500).json({ error: 'Failed to deploy service' });
  }
});

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete a booking
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

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
    booking.addDeploymentLog('Booking deleted', 'info');
    await booking.save();

    // Remove service from user
    req.user.services = req.user.services.filter(service => service.id.toString() !== booking._id.toString());
    await req.user.save();

    res.json({
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    logger.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

module.exports = router;
