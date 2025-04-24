// MongoDB initialization script
// This script will be executed when the MongoDB container starts for the first time

// Connect to admin database with root credentials
db = db.getSiblingDB('admin');

// Check if the database already exists
const dbExists = db.getCollectionNames().includes('system.users');

if (!dbExists) {
  print('Initializing MongoDB...');
  
  // Create the application database
  const appDb = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);
  
  // Create collections
  appDb.createCollection('users');
  appDb.createCollection('services');
  appDb.createCollection('bookings');
  appDb.createCollection('logs');
  
  print('MongoDB initialization completed successfully');
} else {
  print('MongoDB already initialized, skipping initialization');
}
