const mongoose = require('mongoose');

/**
 * Booking Schema
 * Represents a service booked by a user
 */
const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceId: {
    type: String,
    required: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true
  },
  customName: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  port: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'deploying', 'active', 'suspended', 'failed', 'deleted'],
    default: 'pending',
    index: true
  },
  stackId: {
    type: String,
    default: null
  },
  dnsRecordId: {
    type: String,
    default: null
  },
  licenseInfo: {
    email: String,
    password: String
  },
  deploymentLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: String,
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Add deployment log entry
 */
bookingSchema.methods.addDeploymentLog = function(message, level = 'info') {
  this.deploymentLogs.push({
    timestamp: new Date(),
    message,
    level
  });
};

/**
 * Update booking status
 */
bookingSchema.methods.updateStatus = function(status, stackId = null) {
  this.status = status;
  
  if (stackId) {
    this.stackId = stackId;
  }
  
  // Add a log entry
  this.addDeploymentLog(`Status updated to ${status}`, 'info');
};

// Create and export the model
const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
