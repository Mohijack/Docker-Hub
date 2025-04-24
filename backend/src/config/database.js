const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Establishes a connection to MongoDB
 * Implements best practices:
 * - Connection pooling
 * - Automatic reconnection
 * - Proper error handling
 * - Unified topology
 */
const connectDB = async () => {
  try {
    const mongoURI = config.mongo.uri;

    if (!mongoURI) {
      logger.error('MongoDB URI is not defined in environment variables');
      process.exit(1);
    }

    logger.info('Connecting to MongoDB...');

    const options = {
      // Connection pooling - MongoDB driver will maintain a pool of connections
      // to reduce the latency of creating a new connection for every operation
      maxPoolSize: 10,

      // Timeout settings
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,

      // Server selection timeout
      serverSelectionTimeoutMS: 30000,

      // Heartbeat frequency
      heartbeatFrequencyMS: 10000
    };

    await mongoose.connect(mongoURI, options);

    logger.info('MongoDB connected successfully');

    // Log when the connection is disconnected
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    // Log when the connection is reconnected
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB connection reestablished');
    });

    // Log connection errors
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
      // Attempt to reconnect
      setTimeout(() => {
        mongoose.connect(mongoURI, options);
      }, 5000);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
