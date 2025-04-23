const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../utils/config');
const logger = require('../utils/logger');

// In a real application, this would be a database
// For this demo, we'll use a simple JSON file
const USERS_FILE = path.join(__dirname, '../../../data/users.json');

// Ensure data directory exists
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

class UserModel {
  constructor() {
    this.users = this.loadUsers();
  }

  loadUsers() {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading users:', error);
      return [];
    }
  }

  saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      logger.error('Error saving users:', error);
    }
  }

  // Hash password with salt
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // Validate password
  validatePassword(password, hash, salt) {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  }

  // Register a new user
  register(email, password, name, company = '') {
    // Check if user already exists
    if (this.users.find(user => user.email === email)) {
      return { success: false, message: 'User already exists' };
    }

    // Hash password
    const { hash, salt } = this.hashPassword(password);

    // Create user
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      company,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'customer',
      createdAt: new Date().toISOString(),
      services: []
    };

    // Add user to array
    this.users.push(user);
    this.saveUsers();

    // Return user without sensitive data
    const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  }

  // Login user
  login(email, password) {
    // Find user
    const user = this.users.find(user => user.email === email);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Validate password
    if (!this.validatePassword(password, user.passwordHash, user.passwordSalt)) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      config.jwt.secret, 
      { expiresIn: config.jwt.expiresIn }
    );

    // Return user without sensitive data
    const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword, token };
  }

  // Get user by ID
  getUserById(id) {
    const user = this.users.find(user => user.id === id);
    if (!user) return null;

    // Return user without sensitive data
    const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by email
  getUserByEmail(email) {
    const user = this.users.find(user => user.email === email);
    if (!user) return null;

    // Return user without sensitive data
    const { passwordHash, passwordSalt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Update user
  updateUser(id, userData) {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return { success: false, message: 'User not found' };

    // Don't allow updating sensitive fields
    const { email, role, passwordHash, passwordSalt, ...allowedUpdates } = userData;

    // Update user
    this.users[index] = { ...this.users[index], ...allowedUpdates };
    this.saveUsers();

    // Return updated user without sensitive data
    const { passwordHash: ph, passwordSalt: ps, ...userWithoutPassword } = this.users[index];
    return { success: true, user: userWithoutPassword };
  }

  // Add service to user
  addServiceToUser(userId, service) {
    const index = this.users.findIndex(user => user.id === userId);
    if (index === -1) return { success: false, message: 'User not found' };

    // Add service
    this.users[index].services.push(service);
    this.saveUsers();

    return { success: true, services: this.users[index].services };
  }

  // Get user services
  getUserServices(userId) {
    const user = this.users.find(user => user.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    return { success: true, services: user.services };
  }
}

module.exports = new UserModel();
