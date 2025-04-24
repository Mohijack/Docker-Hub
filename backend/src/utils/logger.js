const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');
require('winston-mongodb');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create base transports array
const transports = [
  // Always log to console
  new winston.transports.Console({
    format: consoleFormat
  }),
  // Write to all logs with level 'info' and below to combined.log
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  // Write all logs with level 'error' and below to error.log
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'beyondfire-cloud' },
  transports: transports
});

// Add MongoDB transport if MongoDB URI is available
// This will be added after the initial connection is established
const addMongoTransport = () => {
  if (config.mongo && config.mongo.uri) {
    logger.add(new winston.transports.MongoDB({
      level: 'info',
      db: config.mongo.uri,
      options: {
        useUnifiedTopology: true
      },
      collection: 'logs',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      // Don't cap the collection
      capped: false,
      // Include metadata in the log
      includeIds: true,
      // Store additional metadata
      metaKey: 'meta'
    }));
    console.log('MongoDB transport added to logger');
  }
};

// Add a simple wrapper to ensure logging doesn't throw errors
const safeLogger = {
  info: (message, ...args) => {
    try {
      logger.info(message, ...args);
    } catch (error) {
      console.log(`[INFO] ${message}`, ...args);
      console.error('Logger error:', error);
    }
  },
  error: (message, ...args) => {
    try {
      logger.error(message, ...args);
    } catch (error) {
      console.error(`[ERROR] ${message}`, ...args);
      console.error('Logger error:', error);
    }
  },
  warn: (message, ...args) => {
    try {
      logger.warn(message, ...args);
    } catch (error) {
      console.warn(`[WARN] ${message}`, ...args);
      console.error('Logger error:', error);
    }
  },
  debug: (message, ...args) => {
    try {
      logger.debug(message, ...args);
    } catch (error) {
      console.debug(`[DEBUG] ${message}`, ...args);
      console.error('Logger error:', error);
    }
  }
};

module.exports = { logger: safeLogger, addMongoTransport };
