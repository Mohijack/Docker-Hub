// Script to test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    
    // Get MongoDB URI from environment variables
    const mongoURI = process.env.MONGO_URI || `mongodb://${process.env.MONGO_ROOT_USERNAME}:${process.env.MONGO_ROOT_PASSWORD}@localhost:27017/${process.env.MONGO_DATABASE}?authSource=admin`;
    
    console.log(`Connecting to: ${mongoURI.replace(/:([^:@]+)@/, ':****@')}`);
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000
    });
    
    console.log('MongoDB connection successful!');
    
    // Run a simple query
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    
    console.log('Ping result:', result);
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Run the test
testConnection();
