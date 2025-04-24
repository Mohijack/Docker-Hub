const mongoose = require('mongoose');
const argon2 = require('argon2');
const crypto = require('crypto');

/**
 * User Schema
 * Implements best practices for user data storage:
 * - Argon2 password hashing (winner of the Password Hashing Competition)
 * - Secure password reset mechanism
 * - Two-factor authentication support
 * - Session tracking
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    default: '',
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't include password in query results by default
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'support', 'manager'],
    default: 'user'
  },
  permissions: {
    type: [String],
    default: []
  },
  services: [{
    id: String,
    name: String,
    domain: String,
    port: Number,
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'deleted'],
      default: 'pending'
    },
    createdAt: Date
  }],
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false
    },
    backupCodes: {
      type: [String],
      select: false
    }
  },
  passwordReset: {
    token: {
      type: String,
      select: false
    },
    expires: {
      type: Date,
      select: false
    }
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    expires: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    userAgent: String,
    ipAddress: String
  }],
  lastLogin: {
    date: Date,
    ipAddress: String,
    userAgent: String
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  accountLockedUntil: Date,
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

/**
 * Password validation
 * Checks if the password meets the security requirements
 */
userSchema.statics.validatePassword = function(password) {
  // At least 8 characters
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
};

/**
 * Password comparison
 * Verifies if the provided password matches the stored hash
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Pre-save hook
 * Hashes the password before saving if it's modified
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a hash using argon2id (balanced between argon2i and argon2d)
    this.password = await argon2.hash(this.password, {
      type: argon2.argon2id,
      memoryCost: 2**16, // 64 MiB
      timeCost: 3,       // 3 iterations
      parallelism: 1     // 1 degree of parallelism
    });
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Generate password reset token
 */
userSchema.methods.generatePasswordResetToken = function() {
  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token and store it in the database
  this.passwordReset.token = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration to 1 hour from now
  this.passwordReset.expires = Date.now() + 3600000; // 1 hour

  return resetToken;
};

/**
 * Generate 2FA secret
 */
userSchema.methods.generateTwoFactorSecret = function() {
  // This would be implemented with the otplib library
  // For now, we'll just generate a random string
  return crypto.randomBytes(20).toString('hex');
};

/**
 * Generate backup codes for 2FA
 */
userSchema.methods.generateBackupCodes = function() {
  const backupCodes = [];

  // Generate 10 backup codes
  for (let i = 0; i < 10; i++) {
    // Generate a random 8-character code
    const code = crypto.randomBytes(4).toString('hex');
    backupCodes.push(code);
  }

  // Store hashed versions of the backup codes
  this.twoFactorAuth.backupCodes = backupCodes.map(code =>
    crypto.createHash('sha256').update(code).digest('hex')
  );

  return backupCodes;
};

/**
 * Add a refresh token
 */
userSchema.methods.addRefreshToken = function(token, expires, userAgent, ipAddress) {
  // Remove expired tokens first
  this.refreshTokens = this.refreshTokens.filter(t => t.expires > Date.now());

  // Add the new token
  this.refreshTokens.push({
    token,
    expires,
    userAgent,
    ipAddress,
    createdAt: Date.now()
  });

  // Limit to 5 tokens per user (oldest will be removed)
  if (this.refreshTokens.length > 5) {
    this.refreshTokens.sort((a, b) => a.createdAt - b.createdAt);
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

/**
 * Remove a refresh token
 */
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
};

/**
 * Record login attempt
 */
userSchema.methods.recordLoginAttempt = function(success, ipAddress, userAgent) {
  if (success) {
    // Reset failed login attempts on successful login
    this.failedLoginAttempts = 0;
    this.accountLocked = false;
    this.accountLockedUntil = null;

    // Record successful login
    this.lastLogin = {
      date: new Date(),
      ipAddress,
      userAgent
    };
  } else {
    // Increment failed login attempts
    this.failedLoginAttempts += 1;

    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5) {
      this.accountLocked = true;
      // Lock for 15 minutes
      this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
};

// Create and export the model
const User = mongoose.model('User', userSchema);
module.exports = User;
