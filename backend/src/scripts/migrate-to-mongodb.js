/**
 * Migration script to transfer data from JSON files to MongoDB
 * Run this script after setting up MongoDB to migrate existing data
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

// Import models
const { User, Service, Booking } = require('../models/mongoose');
const config = require('../utils/config');

// Path to JSON files
const USERS_FILE = path.join(__dirname, '../../../data/users.json');
const SERVICES_FILE = path.join(__dirname, '../../../data/services.json');
const BOOKINGS_FILE = path.join(__dirname, '../../../data/bookings.json');

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Load data from JSON files
function loadJsonData(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
    return [];
  }
}

// Migrate users
async function migrateUsers(users) {
  console.log(`Migrating ${users.length} users...`);
  let migratedCount = 0;
  
  for (const user of users) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: user.email });
      
      if (!existingUser) {
        // Create new user with Argon2 hashed password
        const newUser = new User({
          email: user.email,
          name: user.name,
          company: user.company || '',
          role: user.role || 'user',
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          services: user.services || []
        });
        
        // Hash password with Argon2
        if (user.passwordHash && user.passwordSalt) {
          // For existing users with PBKDF2 hashes, we'll create a temporary password
          // In a real-world scenario, you'd implement a password reset flow
          const tempPassword = uuidv4().substring(0, 12) + 'A1!';
          newUser.password = await argon2.hash(tempPassword);
          
          console.log(`Temporary password for ${user.email}: ${tempPassword}`);
        } else {
          // Default password for testing
          newUser.password = await argon2.hash('Password123!');
        }
        
        await newUser.save();
        migratedCount++;
      } else {
        console.log(`User ${user.email} already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error migrating user ${user.email}:`, error);
    }
  }
  
  console.log(`Successfully migrated ${migratedCount} users`);
}

// Migrate services
async function migrateServices(services) {
  console.log(`Migrating ${services.length} services...`);
  let migratedCount = 0;
  
  for (const service of services) {
    try {
      // Check if service already exists
      const existingService = await Service.findOne({ id: service.id });
      
      if (!existingService) {
        // Create new service
        const newService = new Service({
          id: service.id,
          name: service.name,
          description: service.description,
          price: service.price,
          image: service.image,
          resources: service.resources,
          composeTemplate: service.composeTemplate,
          active: true,
          createdAt: new Date()
        });
        
        await newService.save();
        migratedCount++;
      } else {
        console.log(`Service ${service.id} already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error migrating service ${service.id}:`, error);
    }
  }
  
  console.log(`Successfully migrated ${migratedCount} services`);
}

// Migrate bookings
async function migrateBookings(bookings) {
  console.log(`Migrating ${bookings.length} bookings...`);
  let migratedCount = 0;
  
  for (const booking of bookings) {
    try {
      // Check if booking already exists
      const existingBooking = await Booking.findOne({ domain: booking.domain });
      
      if (!existingBooking) {
        // Find user by ID
        const user = await User.findOne({ email: booking.userId });
        
        if (!user) {
          console.log(`User ${booking.userId} not found for booking ${booking.id}, skipping...`);
          continue;
        }
        
        // Create new booking
        const newBooking = new Booking({
          userId: user._id,
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          customName: booking.customName,
          domain: booking.domain,
          port: booking.port,
          status: booking.status,
          stackId: booking.stackId,
          dnsRecordId: booking.dnsRecordId,
          licenseInfo: booking.licenseInfo,
          createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
          expiresAt: booking.expiresAt ? new Date(booking.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deploymentLogs: [{
            timestamp: new Date(),
            message: 'Booking migrated from JSON to MongoDB',
            level: 'info'
          }]
        });
        
        await newBooking.save();
        migratedCount++;
      } else {
        console.log(`Booking ${booking.id} already exists, skipping...`);
      }
    } catch (error) {
      console.error(`Error migrating booking ${booking.id}:`, error);
    }
  }
  
  console.log(`Successfully migrated ${migratedCount} bookings`);
}

// Main migration function
async function migrate() {
  try {
    // Connect to MongoDB
    const connected = await connectDB();
    
    if (!connected) {
      console.error('Failed to connect to MongoDB, aborting migration');
      process.exit(1);
    }
    
    // Load data from JSON files
    const users = loadJsonData(USERS_FILE);
    const services = loadJsonData(SERVICES_FILE);
    const bookings = loadJsonData(BOOKINGS_FILE);
    
    // Migrate data
    await migrateUsers(users);
    await migrateServices(services);
    await migrateBookings(bookings);
    
    console.log('Migration completed successfully');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
