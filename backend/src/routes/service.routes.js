const express = require('express');
const router = express.Router();
const { Service } = require('../models/mongoose');
const { authenticateToken } = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/services
 * @desc    Get all available services
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ active: true });
    res.json(services);
  } catch (error) {
    logger.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findOne({ id: req.params.id, active: true });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    logger.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to get service' });
  }
});

module.exports = router;
