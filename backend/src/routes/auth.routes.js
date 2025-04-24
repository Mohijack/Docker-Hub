const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const {
  authLimiter,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  twoFactorValidation
} = require('../middleware/security.middleware');
const {
  authenticateToken,
  validateRefreshToken
} = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/auth/test
 * @desc    Test auth route
 * @access  Public
 */
router.get('/test', (req, res) => {
  logger.info('Auth test route accessed', {
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    params: req.params
  });
  res.json({
    message: 'Auth routes are working correctly',
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path
  });
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    const result = await authService.register({
      email,
      password,
      name,
      company
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.status(201).json({
      message: 'Registration successful',
      user: result.user
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    // Log client information
    const clientIp = req.ip;
    const xForwardedFor = req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const originalUrl = req.originalUrl;

    logger.info('Login attempt received', {
      body: req.body,
      clientIp,
      xForwardedFor,
      userAgent,
      originalUrl
    });

    // Simple login for testing
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if email and password match the admin credentials
    if (email === 'admin@beyondfire.cloud' && password === 'AdminPW!') {
      // Generate a simple token
      const token = 'test-token-' + Date.now();

      logger.info('Login successful', { email, clientIp, xForwardedFor });

      return res.json({
        message: 'Login successful',
        user: {
          email,
          name: 'Admin',
          role: 'admin'
        },
        accessToken: token
      });
    }

    // If credentials don't match, return error
    logger.warn('Login failed - Invalid credentials', { email, clientIp, xForwardedFor });
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify 2FA token
 * @access  Public
 */
router.post('/verify-2fa', authLimiter, twoFactorValidation, async (req, res) => {
  try {
    const { token, tempToken } = req.body;

    const result = await authService.verify2FA(tempToken, token);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: '2FA verification successful',
      user: result.user,
      accessToken: result.accessToken
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh-token', validateRefreshToken, async (req, res) => {
  try {
    const refreshToken = req.refreshToken;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip;

    const result = await authService.refreshToken(refreshToken, userAgent, ipAddress);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken: result.accessToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({ message: 'Logged out' });
    }

    await authService.logout(refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @route   POST /api/auth/setup-2fa
 * @desc    Setup 2FA
 * @access  Private
 */
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  try {
    const result = await authService.setup2FA(req.user._id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      secret: result.secret,
      qrCode: result.qrCode
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA setup failed' });
  }
});

/**
 * @route   POST /api/auth/enable-2fa
 * @desc    Enable 2FA
 * @access  Private
 */
router.post('/enable-2fa', authenticateToken, twoFactorValidation, async (req, res) => {
  try {
    const { token } = req.body;

    const result = await authService.enable2FA(req.user._id, token);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: '2FA enabled successfully',
      backupCodes: result.backupCodes
    });
  } catch (error) {
    logger.error('2FA enable error:', error);
    res.status(500).json({ error: '2FA enable failed' });
  }
});

/**
 * @route   POST /api/auth/disable-2fa
 * @desc    Disable 2FA
 * @access  Private
 */
router.post('/disable-2fa', authenticateToken, twoFactorValidation, async (req, res) => {
  try {
    const { token } = req.body;

    const result = await authService.disable2FA(req.user._id, token);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({ error: '2FA disable failed' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public (with reset token)
 */
router.post('/reset-password', authLimiter, resetPasswordValidation, async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const result = await authService.changePassword(req.user._id, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;
