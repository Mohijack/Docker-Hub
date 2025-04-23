const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const logger = require('./utils/logger');
const routes = require('./routes');
const config = require('./utils/config');
const cloudflareService = require('./integrations/cloudflare');

const app = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Log Cloudflare status on startup
if (!cloudflareService.isEnabled()) {
  logger.info('Cloudflare integration is disabled');
}

// API Routes
app.use('/api', routes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// For any other request, send the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});


