const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

// Ensure logs directory exists
if (!fs.existsSync(path.join(__dirname, '../../logs'))) {
  fs.mkdirSync(path.join(__dirname, '../../logs'), { recursive: true });
}

// Write startup log to file directly (in case logger module fails)
fs.writeFileSync(
  path.join(__dirname, '../../logs/startup.log'),
  `Server starting at ${new Date().toISOString()}\n`,
  { flag: 'a' }
);

try {
  // Load configuration and modules
  const { logger, addMongoTransport } = require('./utils/logger');
  const config = require('./utils/config');
  const connectDB = require('./config/database');

  // Log startup information
  logger.info('Starting BeyondFire Cloud API server');
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Connect to MongoDB
  connectDB()
    .then(() => {
      // Add MongoDB transport to logger after successful connection
      addMongoTransport();

      // Continue with server setup
      startServer();
    })
    .catch(error => {
      logger.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    });

  // Server setup function
  async function startServer() {
    // Load remaining modules
    const routes = require('./routes');
    const cloudflareService = require('./integrations/cloudflare');
    const { apiLimiter } = require('./middleware/security.middleware');

    const app = express();
    const PORT = config.port || 3000;

    // Trust proxy - required for express-rate-limit to work correctly behind Nginx
    app.set('trust proxy', true);
    logger.info('Express trust proxy setting enabled');

    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Apply rate limiting to all requests
    app.use(apiLimiter);

    // Request logging
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
      next();
    });

    // Add response time header
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Log Cloudflare status on startup
    if (!cloudflareService.isEnabled()) {
      logger.info('Cloudflare integration is disabled');
    }

    // Basic health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });
    });

    // Direct API test endpoint
    app.get('/api/direct-test', (req, res) => {
      logger.info('Direct API test route accessed', {
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        params: req.params
      });
      res.json({
        message: 'Direct API test route is working correctly',
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path
      });
    });

    // Direct API test routes
    app.get('/api/test', (req, res) => {
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

    app.get('/api/auth/test', (req, res) => {
      logger.info('Auth test route accessed', {
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path,
        params: req.params
      });
      res.json({
        message: 'Auth routes are working correctly',
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        path: req.path
      });
    });

    app.post('/api/auth/login', async (req, res) => {
      try {
        // Log client information
        const clientIp = req.ip;
        const xForwardedFor = req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const originalUrl = req.originalUrl;

        logger.info('Login attempt received', {
          body: req.body,
          clientIp,
          xForwardedFor,
          userAgent,
          originalUrl
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

    // API Routes (for other routes)
    app.use('/api', routes);

    // Direct login test route
    const loginTestRoutes = require('./routes/login-test');
    app.use('/login-test', loginTestRoutes);

    // API 404 handler
    app.use('/api/*', (req, res) => {
      logger.warn(`API route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Serve static frontend files
    app.use(express.static(path.join(__dirname, '../../frontend/build')));

    // For any other request, send the React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
    });

    // Error handling
    app.use((err, req, res, next) => {
      logger.error('API Error:', err.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : undefined
      });
    });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      fs.writeFileSync(
        path.join(__dirname, '../../logs/server-error.log'),
        `Server error at ${new Date().toISOString()}: ${error.message}\n${error.stack}\n`,
        { flag: 'a' }
      );
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    function gracefulShutdown() {
      logger.info('Received shutdown signal, closing server and database connections...');

      server.close(() => {
        logger.info('HTTP server closed');

        // Close MongoDB connection
        mongoose.connection.close(false)
          .then(() => {
            logger.info('MongoDB connection closed');
            process.exit(0);
          })
          .catch(err => {
            logger.error('Error closing MongoDB connection:', err);
            process.exit(1);
          });
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    }
  }

} catch (error) {
  // Write error to file directly (in case logger module fails)
  fs.writeFileSync(
    path.join(__dirname, '../../logs/startup-error.log'),
    `Startup error at ${new Date().toISOString()}: ${error.message}\n${error.stack}\n`,
    { flag: 'a' }
  );
  console.error('Startup error:', error);
  process.exit(1);
}
