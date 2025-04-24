const mongoose = require('mongoose');

/**
 * Service Schema
 * Represents a Docker service template that can be booked by users
 */
const serviceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  resources: {
    cpu: {
      type: Number,
      required: true,
      min: 0
    },
    memory: {
      type: String,
      required: true,
      trim: true
    },
    storage: {
      type: String,
      required: true,
      trim: true
    }
  },
  composeTemplate: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create and export the model
const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
