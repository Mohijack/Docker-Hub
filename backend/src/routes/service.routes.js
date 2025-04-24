const express = require('express');
const router = express.Router();
const { Service } = require('../models/mongoose');
const {
  authenticateToken,
  requirePermission
} = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');
const {
  SERVICE_READ,
  SERVICE_CREATE,
  SERVICE_UPDATE,
  SERVICE_DELETE
} = require('../utils/permissions');

/**
 * @route   GET /api/services
 * @desc    Get all available services
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Get services from database
    const services = await Service.find({ active: true });

    // If no services found, return a hardcoded FE2 service
    if (services.length === 0) {
      const hardcodedService = {
        id: 'fe2-docker',
        name: 'FE2 - Feuerwehr Einsatzleitsystem',
        description: 'Alamos FE2 - Professionelles Einsatzleitsystem für Feuerwehren',
        price: 19.99,
        image: 'alamosgmbh/fe2:latest',
        resources: {
          cpu: 2,
          memory: '2GB',
          storage: '10GB'
        },
        active: true
      };

      return res.json({ services: [hardcodedService] });
    }

    res.json({ services });
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
    // Get service from database
    const service = await Service.findOne({ id: req.params.id, active: true });

    if (!service) {
      // If service not found, check if it's the hardcoded FE2 service
      if (req.params.id === 'fe2-docker') {
        const hardcodedService = {
          id: 'fe2-docker',
          name: 'FE2 - Feuerwehr Einsatzleitsystem',
          description: 'Alamos FE2 - Professionelles Einsatzleitsystem für Feuerwehren',
          price: 19.99,
          image: 'alamosgmbh/fe2:latest',
          resources: {
            cpu: 2,
            memory: '2GB',
            storage: '10GB'
          },
          active: true
        };

        return res.json({ service: hardcodedService });
      }

      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    logger.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to get service' });
  }
});

/**
 * @route   POST /api/services
 * @desc    Create a new service
 * @access  Private (requires service:create permission)
 */
router.post('/', authenticateToken, requirePermission(SERVICE_CREATE), async (req, res) => {
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

    logger.info('Service created successfully', {
      serviceId: service.id,
      createdBy: req.user.email
    });

    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    logger.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

/**
 * @route   PUT /api/services/:id
 * @desc    Update a service
 * @access  Private (requires service:update permission)
 */
router.put('/:id', authenticateToken, requirePermission(SERVICE_UPDATE), async (req, res) => {
  try {
    const { name, description, price, image, resources, composeTemplate, active } = req.body;

    // Find service
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

    logger.info('Service updated successfully', {
      serviceId: service.id,
      updatedBy: req.user.email
    });

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    logger.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete a service
 * @access  Private (requires service:delete permission)
 */
router.delete('/:id', authenticateToken, requirePermission(SERVICE_DELETE), async (req, res) => {
  try {
    // Find service
    const service = await Service.findOne({ id: req.params.id });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Delete service
    await Service.findByIdAndDelete(service._id);

    logger.info('Service deleted successfully', {
      serviceId: service.id,
      deletedBy: req.user.email
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    logger.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
