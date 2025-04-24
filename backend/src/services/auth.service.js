const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models/mongoose');
const config = require('../utils/config');
const { logger } = require('../utils/logger');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

/**
 * Authentication Service
 * Implements state-of-the-art authentication practices:
 * - JWT with refresh tokens
 * - Token rotation for enhanced security
 * - Two-factor authentication
 * - Brute force protection
 * - Secure password reset
 */
class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    try {
      const { email, password, name, company } = userData;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return { success: false, message: 'User already exists' };
      }
      
      // Validate password
      const passwordValidation = User.validatePassword(password);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }
      
      // Create new user
      const user = new User({
        email,
        password,
        name,
        company: company || '',
        role: 'user'
      });
      
      // Save user
      await user.save();
      
      // Return user without sensitive data
      const userObject = user.toObject();
      delete userObject.password;
      
      return { success: true, user: userObject };
    } catch (error) {
      logger.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }
  
  /**
   * Login user
   */
  async login(email, password, userAgent, ipAddress) {
    try {
      // Find user with password included
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }
      
      // Check if account is locked
      if (user.accountLocked && user.accountLockedUntil > Date.now()) {
        return { 
          success: false, 
          message: `Account is locked. Please try again after ${new Date(user.accountLockedUntil).toLocaleString()}` 
        };
      }
      
      // Verify password
      const isMatch = await user.comparePassword(password);
      
      // Record login attempt
      user.recordLoginAttempt(isMatch, ipAddress, userAgent);
      await user.save();
      
      if (!isMatch) {
        return { success: false, message: 'Invalid credentials' };
      }
      
      // Check if 2FA is enabled
      if (user.twoFactorAuth.enabled) {
        // Generate a temporary token for 2FA verification
        const tempToken = jwt.sign(
          { id: user._id, require2FA: true },
          config.jwt.secret,
          { expiresIn: '5m' }
        );
        
        return { 
          success: true, 
          require2FA: true,
          tempToken
        };
      }
      
      // Generate tokens
      const { accessToken, refreshToken, refreshTokenExpiry } = this.generateTokens(user);
      
      // Add refresh token to user
      user.addRefreshToken(
        refreshToken,
        new Date(refreshTokenExpiry),
        userAgent,
        ipAddress
      );
      
      // Save user
      await user.save();
      
      // Return user without sensitive data
      const userObject = user.toObject();
      delete userObject.password;
      delete userObject.refreshTokens;
      
      return { 
        success: true, 
        user: userObject, 
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }
  
  /**
   * Verify 2FA token
   */
  async verify2FA(tempToken, totpToken) {
    try {
      // Verify temp token
      const decoded = jwt.verify(tempToken, config.jwt.secret);
      
      if (!decoded.require2FA) {
        return { success: false, message: 'Invalid token' };
      }
      
      // Find user with 2FA secret
      const user = await User.findById(decoded.id).select('+twoFactorAuth.secret +twoFactorAuth.backupCodes');
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Verify TOTP token
      const isValid = authenticator.verify({
        token: totpToken,
        secret: user.twoFactorAuth.secret
      });
      
      if (!isValid) {
        // Check if it's a backup code
        const hashedToken = crypto.createHash('sha256').update(totpToken).digest('hex');
        const backupCodeIndex = user.twoFactorAuth.backupCodes.indexOf(hashedToken);
        
        if (backupCodeIndex === -1) {
          return { success: false, message: 'Invalid 2FA token' };
        }
        
        // Remove used backup code
        user.twoFactorAuth.backupCodes.splice(backupCodeIndex, 1);
      }
      
      // Generate tokens
      const { accessToken, refreshToken, refreshTokenExpiry } = this.generateTokens(user);
      
      // Add refresh token to user
      user.addRefreshToken(
        refreshToken,
        new Date(refreshTokenExpiry),
        'Unknown', // We don't have this info in the 2FA flow
        'Unknown'
      );
      
      // Save user
      await user.save();
      
      // Return user without sensitive data
      const userObject = user.toObject();
      delete userObject.password;
      delete userObject.refreshTokens;
      delete userObject.twoFactorAuth.secret;
      delete userObject.twoFactorAuth.backupCodes;
      
      return { 
        success: true, 
        user: userObject, 
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('2FA verification error:', error);
      return { success: false, message: '2FA verification failed' };
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, userAgent, ipAddress) {
    try {
      // Find user with this refresh token
      const user = await User.findOne({
        'refreshTokens.token': refreshToken,
        'refreshTokens.expires': { $gt: new Date() }
      });
      
      if (!user) {
        return { success: false, message: 'Invalid refresh token' };
      }
      
      // Remove the used refresh token (token rotation)
      user.removeRefreshToken(refreshToken);
      
      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken, refreshTokenExpiry } = this.generateTokens(user);
      
      // Add new refresh token to user
      user.addRefreshToken(
        newRefreshToken,
        new Date(refreshTokenExpiry),
        userAgent,
        ipAddress
      );
      
      // Save user
      await user.save();
      
      return { 
        success: true, 
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }
  
  /**
   * Logout user
   */
  async logout(refreshToken) {
    try {
      // Find user with this refresh token
      const user = await User.findOne({
        'refreshTokens.token': refreshToken
      });
      
      if (!user) {
        return { success: true, message: 'Logged out' };
      }
      
      // Remove the refresh token
      user.removeRefreshToken(refreshToken);
      
      // Save user
      await user.save();
      
      return { success: true, message: 'Logged out' };
    } catch (error) {
      logger.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }
  
  /**
   * Setup 2FA
   */
  async setup2FA(userId) {
    try {
      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Generate secret
      const secret = authenticator.generateSecret();
      
      // Generate QR code
      const otpauth = authenticator.keyuri(user.email, 'BeyondFire Cloud', secret);
      const qrCode = await QRCode.toDataURL(otpauth);
      
      // Store secret temporarily (not enabled yet)
      user.twoFactorAuth.secret = secret;
      await user.save();
      
      return { 
        success: true, 
        secret,
        qrCode
      };
    } catch (error) {
      logger.error('2FA setup error:', error);
      return { success: false, message: '2FA setup failed' };
    }
  }
  
  /**
   * Verify and enable 2FA
   */
  async enable2FA(userId, token) {
    try {
      // Find user with 2FA secret
      const user = await User.findById(userId).select('+twoFactorAuth.secret');
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Verify token
      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorAuth.secret
      });
      
      if (!isValid) {
        return { success: false, message: 'Invalid token' };
      }
      
      // Generate backup codes
      const backupCodes = user.generateBackupCodes();
      
      // Enable 2FA
      user.twoFactorAuth.enabled = true;
      await user.save();
      
      return { 
        success: true, 
        backupCodes
      };
    } catch (error) {
      logger.error('2FA enable error:', error);
      return { success: false, message: '2FA enable failed' };
    }
  }
  
  /**
   * Disable 2FA
   */
  async disable2FA(userId, token) {
    try {
      // Find user with 2FA secret
      const user = await User.findById(userId).select('+twoFactorAuth.secret +twoFactorAuth.backupCodes');
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Verify token
      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorAuth.secret
      });
      
      if (!isValid) {
        // Check if it's a backup code
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const backupCodeIndex = user.twoFactorAuth.backupCodes.indexOf(hashedToken);
        
        if (backupCodeIndex === -1) {
          return { success: false, message: 'Invalid token' };
        }
      }
      
      // Disable 2FA
      user.twoFactorAuth.enabled = false;
      user.twoFactorAuth.secret = undefined;
      user.twoFactorAuth.backupCodes = [];
      await user.save();
      
      return { success: true };
    } catch (error) {
      logger.error('2FA disable error:', error);
      return { success: false, message: '2FA disable failed' };
    }
  }
  
  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      // Find user
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal that the user doesn't exist
        return { success: true, message: 'If your email is registered, you will receive a password reset link' };
      }
      
      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();
      
      // In a real application, send an email with the reset link
      // For this demo, we'll just return the token
      return { 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link',
        resetToken // This would normally be sent via email
      };
    } catch (error) {
      logger.error('Password reset request error:', error);
      return { success: false, message: 'Password reset request failed' };
    }
  }
  
  /**
   * Reset password
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Hash the token
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Find user with this token
      const user = await User.findOne({
        'passwordReset.token': hashedToken,
        'passwordReset.expires': { $gt: Date.now() }
      });
      
      if (!user) {
        return { success: false, message: 'Invalid or expired reset token' };
      }
      
      // Validate password
      const passwordValidation = User.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }
      
      // Update password
      user.password = newPassword;
      
      // Clear reset token
      user.passwordReset.token = undefined;
      user.passwordReset.expires = undefined;
      
      // Invalidate all refresh tokens
      user.refreshTokens = [];
      
      await user.save();
      
      return { success: true, message: 'Password reset successful' };
    } catch (error) {
      logger.error('Password reset error:', error);
      return { success: false, message: 'Password reset failed' };
    }
  }
  
  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Find user with password
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      
      if (!isMatch) {
        return { success: false, message: 'Current password is incorrect' };
      }
      
      // Validate new password
      const passwordValidation = User.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }
      
      // Update password
      user.password = newPassword;
      
      // Invalidate all refresh tokens except the current one
      // This would require passing the current refresh token to this method
      
      await user.save();
      
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change error:', error);
      return { success: false, message: 'Password change failed' };
    }
  }
  
  /**
   * Generate access and refresh tokens
   */
  generateTokens(user) {
    // Generate access token
    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // Generate refresh token
    const refreshToken = uuidv4();
    
    // Calculate refresh token expiry
    const refreshTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    
    return { accessToken, refreshToken, refreshTokenExpiry };
  }
}

module.exports = new AuthService();
