const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const serviceRoutes = require('./service.routes');
const bookingRoutes = require('./booking.routes');
const adminRoutes = require('./admin.routes');
const { logger } = require('../utils/logger');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint
router.get('/test', (req, res) => {
  const { logger } = require('../utils/logger');
  logger.info('API test route accessed', {
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    params: req.params
  });
  res.json({
    message: 'API routes are working correctly',
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);

// 404 handler for API routes
router.use((req, res) => {
  logger.warn(`API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = router;
