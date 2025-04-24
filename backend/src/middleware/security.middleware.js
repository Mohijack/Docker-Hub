const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const config = require('../utils/config');
const { logger } = require('../utils/logger');

/**
 * Rate limiting middleware
 * Protects against brute force attacks
 */
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Use a more specific trust proxy setting
  trustProxy: false, // Disable the trust proxy warning
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});

/**
 * More strict rate limiting for authentication routes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Use a more specific trust proxy setting
  trustProxy: false, // Disable the trust proxy warning
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      error: 'Too many authentication attempts, please try again later.'
    });
  }
});

/**
 * Validate request body
 * Returns appropriate error messages for invalid input
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: config.security.passwordMinLength })
    .withMessage(`Password must be at least ${config.security.passwordMinLength} characters long`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  validateRequest
];

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

/**
 * Password reset validation rules
 */
const resetPasswordValidation = [
  body('password')
    .isLength({ min: config.security.passwordMinLength })
    .withMessage(`Password must be at least ${config.security.passwordMinLength} characters long`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  validateRequest
];

/**
 * Two-factor authentication validation rules
 */
const twoFactorValidation = [
  body('token')
    .isLength({ min: 6, max: 6 })
    .withMessage('Token must be 6 digits')
    .isNumeric()
    .withMessage('Token must contain only numbers'),
  validateRequest
];

module.exports = {
  apiLimiter,
  authLimiter,
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  twoFactorValidation
};
