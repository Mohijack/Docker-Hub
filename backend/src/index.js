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

    // Keep direct test endpoint for diagnostics
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

    // Direct login route
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

        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        // No special case for admin user anymore
        // All users must be authenticated through the database

        // Use the auth service for login
        const authService = require('./services/auth.service');
        const result = await authService.login(email, password, userAgent, clientIp);

        if (!result.success) {
          if (result.require2FA) {
            return res.status(200).json({
              require2FA: true,
              tempToken: result.tempToken
            });
          }
          logger.warn('Login failed - Invalid credentials', { email, clientIp, xForwardedFor });
          return res.status(401).json({ error: result.message || 'Invalid credentials' });
        }

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        logger.info('Login successful', { email, clientIp, xForwardedFor });

        return res.json({
          message: 'Login successful',
          user: result.user,
          accessToken: result.accessToken
        });
      } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Direct register route
    app.post('/api/auth/register', async (req, res) => {
      try {
        const { email, password, name, company } = req.body;

        // Simple validation
        if (!email || !password || !name) {
          return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Use the auth service for registration
        const authService = require('./services/auth.service');
        const result = await authService.register({ email, password, name, company });

        if (!result.success) {
          return res.status(400).json({ error: result.message });
        }

        logger.info('User registered successfully', { email });

        res.status(201).json({
          message: 'Registration successful',
          user: result.user
        });
      } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    });

    // Redirect profile requests to user routes
    app.get('/api/users/profile', (req, res) => {
      res.redirect(307, '/api/users/me');
    });

    // Services routes
    const serviceRoutes = require('./routes/service.routes');
    app.use('/api/services', serviceRoutes);

    // Token refresh route
    app.post('/api/auth/refresh-token', async (req, res) => {
      try {
        // Get refresh token from cookie or request body
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
          return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Get client information
        const clientIp = req.ip;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Use the auth service to refresh the token
        const authService = require('./services/auth.service');
        const result = await authService.refreshToken(refreshToken, userAgent, clientIp);

        if (!result.success) {
          return res.status(401).json({ error: result.message });
        }

        // Set new refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return new access token
        res.json({
          accessToken: result.accessToken
        });
      } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
      }
    });

    // Logout route
    app.post('/api/auth/logout', async (req, res) => {
      try {
        // Get refresh token from cookie or request body
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
          // If no refresh token, just clear the cookie and return success
          res.clearCookie('refreshToken');
          return res.json({ message: 'Logged out' });
        }

        // Use the auth service to logout
        const authService = require('./services/auth.service');
        const result = await authService.logout(refreshToken);

        // Clear the refresh token cookie
        res.clearCookie('refreshToken');

        // Return success
        res.json({ message: 'Logged out' });
      } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    });

    // Debug middleware for all requests
    app.use((req, res, next) => {
      logger.debug(`Request received: ${req.method} ${req.originalUrl}`, {
        baseUrl: req.baseUrl,
        path: req.path,
        params: req.params,
        ip: req.ip
      });
      next();
    });

    // Add cookie-parser middleware
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());

    // Setup middleware - must be added before routes
    const { setupRequired } = require('./middleware/setup.middleware');
    app.use(setupRequired);

    // API routes
    const apiRoutes = require('./routes/index');
    app.use('/api', apiRoutes);

    // Direct login test route
    const loginTestRoutes = require('./routes/login-test');
    app.use('/login-test', loginTestRoutes);

    // Setup routes
    const setupRoutes = require('./routes/setup.routes');
    app.use('/api/setup', setupRoutes);

    // Temporary route to check admin user
    app.get('/api/check-admin', async (req, res) => {
      try {
        // Find admin user
        const User = mongoose.model('User');
        const adminUser = await User.findOne({ email: 'admin@beyondfire.cloud' });

        if (!adminUser) {
          return res.status(404).json({ error: 'Admin user not found' });
        }

        // Return admin user info (without sensitive data)
        const adminInfo = {
          id: adminUser._id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          permissions: adminUser.permissions,
          createdAt: adminUser.createdAt
        };

        res.json({ adminUser: adminInfo });
      } catch (error) {
        logger.error('Check admin error:', error);
        res.status(500).json({ error: 'Failed to check admin user' });
      }
    });

    // Temporary route to create admin user
    app.post('/api/create-admin', async (req, res) => {
      try {
        // Check if admin user already exists
        const User = mongoose.model('User');
        const existingAdmin = await User.findOne({ email: 'admin@beyondfire.cloud' });

        if (existingAdmin) {
          return res.json({
            message: 'Admin user already exists',
            user: {
              id: existingAdmin._id,
              email: existingAdmin.email,
              name: existingAdmin.name,
              role: existingAdmin.role
            }
          });
        }

        // Create admin user with direct password hash (bypassing the pre-save hook)
        const adminUser = new User({
          email: 'admin@beyondfire.cloud',
          // Direct hash for 'AdminPW!' - bypassing the pre-save hook
          password: '$argon2id$v=19$m=65536,t=3,p=1$tnFQzxFRMuYPJUOLlJQMYQ$3Gg9PJSGSKGjEmKvx7b0yNGNGFHXpZ4IGIvYZjAOvFo',
          name: 'Admin',
          role: 'admin',
          permissions: [
            // User permissions
            'user:read', 'user:create', 'user:update', 'user:delete',
            // Service permissions
            'service:read', 'service:create', 'service:update', 'service:delete',
            // Booking permissions
            'booking:read', 'booking:create', 'booking:update', 'booking:delete',
            // Admin permissions
            'admin:access', 'admin:logs', 'admin:settings'
          ]
        });

        await adminUser.save();

        logger.info('Admin user created successfully');

        res.status(201).json({
          message: 'Admin user created successfully',
          user: {
            id: adminUser._id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role
          }
        });
      } catch (error) {
        logger.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin user' });
      }
    });

    // API 404 handler - MUST be defined AFTER routes
    app.use('/api/*', (req, res) => {
      logger.warn(`API route not found: ${req.method} ${req.originalUrl}`, {
        baseUrl: req.baseUrl,
        path: req.path,
        params: req.params,
        ip: req.ip
      });
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
