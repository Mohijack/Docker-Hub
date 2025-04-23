const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('./utils/config');
const logger = require('./utils/logger');
const portainerService = require('./integrations/portainer');
const userModel = require('./models/user');
const dockerServiceModel = require('./models/docker-service');
const deploymentService = require('./services/deployment');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = userModel.register(email, password, name, company);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.status(201).json({ message: 'User registered successfully', user: result.user });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const result = userModel.login(email, password);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = userModel.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, company } = req.body;

    const result = userModel.updateUser(req.user.id, { name, company });

    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }

    res.json({ message: 'Profile updated successfully', user: result.user });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available services
router.get('/services', async (req, res) => {
  try {
    const services = dockerServiceModel.getAllServices();
    res.json({ services });
  } catch (error) {
    logger.error('Services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service details
router.get('/services/:id', async (req, res) => {
  try {
    const service = dockerServiceModel.getServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service });
  } catch (error) {
    logger.error('Service details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book a service
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const { serviceId, customDomain, customName, licenseInfo } = req.body;

    if (!serviceId) {
      return res.status(400).json({ error: 'Service ID is required' });
    }

    // Check if service requires license information
    const service = dockerServiceModel.getServiceById(serviceId);
    if (service && serviceId === 'fe2-docker') {
      if (!licenseInfo || !licenseInfo.email || !licenseInfo.password) {
        return res.status(400).json({
          error: 'Lizenzinformationen sind erforderlich für FE2',
          requiredFields: ['licenseInfo.email', 'licenseInfo.password']
        });
      }
    }

    const result = dockerServiceModel.bookService(
      req.user.id,
      serviceId,
      customDomain,
      customName,
      licenseInfo
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.status(201).json({
      message: 'Service booked successfully',
      booking: result.booking
    });
  } catch (error) {
    logger.error('Booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user bookings
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = dockerServiceModel.getUserBookings(req.user.id);
    res.json({ bookings });
  } catch (error) {
    logger.error('Bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking details
router.get('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ booking });
  } catch (error) {
    logger.error('Booking details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deploy a service
router.post('/bookings/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deploymentService.deployService(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: 'Service deployment initiated',
      details: result
    });
  } catch (error) {
    logger.error('Deployment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suspend a service
router.post('/bookings/:id/suspend', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deploymentService.suspendService(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'Service suspended successfully' });
  } catch (error) {
    logger.error('Suspension error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resume a service
router.post('/bookings/:id/resume', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deploymentService.resumeService(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'Service resumed successfully' });
  } catch (error) {
    logger.error('Resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service logs
router.get('/bookings/:id/logs', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deploymentService.getServiceLogs(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ logs: result.logs });
  } catch (error) {
    logger.error('Logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a service
router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = dockerServiceModel.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking belongs to user or user is admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await deploymentService.deleteService(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    logger.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes

// Get all users (admin only)
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = userModel.loadUsers().map(user => {
      const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({ users });
  } catch (error) {
    logger.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (admin only)
router.get('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = userModel.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, passwordSalt, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error) {
    logger.error('Admin user details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user services (admin only)
router.get('/admin/users/:id/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const services = dockerServiceModel.getUserBookings(req.params.id);
    res.json({ services });
  } catch (error) {
    logger.error('Admin user services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/admin/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const result = userModel.resetPassword(req.params.id, password);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change user role (admin only)
router.post('/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = userModel.updateUser(req.params.id, { role });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'Role updated successfully', user: result.user });
  } catch (error) {
    logger.error('Admin role change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // First delete all user's services
    const services = dockerServiceModel.getUserBookings(req.params.id);

    for (const service of services) {
      await deploymentService.deleteService(service.id);
    }

    // Then delete the user
    const result = userModel.deleteUser(req.params.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin user delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all services with user info (admin only)
router.get('/admin/services', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = dockerServiceModel.loadBookings();
    const users = userModel.loadUsers();

    // Enrich bookings with user information
    const services = bookings.map(booking => {
      const user = users.find(u => u.id === booking.userId);
      return {
        ...booking,
        userName: user ? user.name : null,
        userEmail: user ? user.email : null
      };
    });

    res.json({ services });
  } catch (error) {
    logger.error('Admin services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Perform service action (admin only)
router.post('/admin/services/:id/:action', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    const booking = dockerServiceModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Service not found' });
    }

    let result;

    switch (action) {
      case 'deploy':
        result = await deploymentService.deployService(id);
        break;
      case 'suspend':
        result = await deploymentService.suspendService(id);
        break;
      case 'resume':
        result = await deploymentService.resumeService(id);
        break;
      case 'delete':
        result = await deploymentService.deleteService(id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: `Service ${action} successful`,
      status: action === 'deploy' ? 'deploying' :
              action === 'suspend' ? 'suspended' :
              action === 'resume' ? 'active' : 'deleted'
    });
  } catch (error) {
    logger.error(`Admin service ${req.params.action} error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system logs (admin only)
router.get('/admin/logs/:type', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    let logs = [];

    // Mock logs for demonstration
    if (type === 'frontend') {
      logs = [
        { timestamp: '2023-04-23T10:15:32.123Z', message: 'Frontend application started' },
        { timestamp: '2023-04-23T10:16:45.456Z', message: 'User login successful: user@example.com' },
        { timestamp: '2023-04-23T10:18:12.789Z', message: 'Service booking initiated: fe2-docker' },
        { timestamp: '2023-04-23T10:20:33.012Z', message: 'Error: Failed to load service details' },
        { timestamp: '2023-04-23T10:22:54.345Z', message: 'Warning: Slow API response detected' }
      ];
    } else if (type === 'backend') {
      logs = [
        { timestamp: '2023-04-23T10:15:30.123Z', message: 'Server started on port 3000' },
        { timestamp: '2023-04-23T10:16:44.456Z', message: 'Authentication successful for user@example.com' },
        { timestamp: '2023-04-23T10:18:10.789Z', message: 'Booking created: fe2-docker for user 123456' },
        { timestamp: '2023-04-23T10:20:31.012Z', message: 'Error: Database connection timeout' },
        { timestamp: '2023-04-23T10:22:52.345Z', message: 'Warning: High CPU usage detected' }
      ];
    } else if (type === 'service') {
      // Return empty array if no service ID is provided
      logs = [];
    } else {
      return res.status(400).json({ error: 'Invalid log type' });
    }

    res.json({ logs });
  } catch (error) {
    logger.error('Admin logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service logs (admin only)
router.get('/admin/logs/service/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = dockerServiceModel.getBookingById(id);

    if (!booking) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await deploymentService.getServiceLogs(id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ logs: result.logs });
  } catch (error) {
    logger.error('Admin service logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bookings (admin only)
router.get('/admin/bookings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookings = dockerServiceModel.loadBookings();
    res.json({ bookings });
  } catch (error) {
    logger.error('Admin bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Portainer status check
router.get('/portainer/status', authenticateToken, async (req, res) => {
  try {
    logger.info('Checking Portainer status...');
    logger.info(`Portainer URL: ${config.portainer.url}`);
    logger.info(`Portainer username: ${config.portainer.username}`);

    try {
      // First check if Portainer is reachable
      const statusResponse = await axios.get(`${config.portainer.url}/api/status`);
      logger.info(`Portainer status response: ${JSON.stringify(statusResponse.data)}`);
      logger.info(`Portainer version: ${statusResponse.data.Version}`);

      // Then try to authenticate
      const token = await portainerService.authenticate();
      logger.info('Portainer authentication successful');
      logger.info(`JWT token received: ${token ? 'Yes' : 'No'}`);

      // Test endpoints access with token
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const endpointsResponse = await axios.get(`${config.portainer.url}/api/endpoints`, { headers });
      logger.info(`Endpoints access successful. Found ${endpointsResponse.data.length || 0} endpoints.`);

      res.json({
        status: 'connected',
        version: statusResponse.data.Version,
        message: 'Successfully connected to Portainer',
        endpoints: endpointsResponse.data.length || 0
      });
    } catch (portainerError) {
      logger.error('Portainer connection error:', portainerError.message);
      if (portainerError.response) {
        logger.error(`Status: ${portainerError.response.status}`);
        logger.error(`Data: ${JSON.stringify(portainerError.response.data)}`);
      }
      throw new Error(`Portainer connection failed: ${portainerError.message}`);
    }
  } catch (error) {
    logger.error('Portainer status check failed:', error.message);
    res.status(500).json({
      error: 'Failed to connect to Portainer',
      message: error.message
    });
  }
});

module.exports = router;
