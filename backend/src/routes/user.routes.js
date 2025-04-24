const express = require('express');
const router = express.Router();
const { User } = require('../models/mongoose');
const {
  authenticateToken,
  requirePermission
} = require('../middleware/auth.middleware');
const { logger } = require('../utils/logger');
const {
  USER_READ,
  USER_CREATE,
  USER_UPDATE,
  USER_DELETE
} = require('../utils/permissions');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User is already attached to req by authenticateToken middleware
    res.json(req.user);
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, company } = req.body;

    // Update only allowed fields
    if (name) req.user.name = name;
    if (company !== undefined) req.user.company = company;

    // Save updated user
    await req.user.save();

    res.json({
      message: 'Profile updated successfully',
      user: req.user
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

/**
 * @route   GET /api/users/me/services
 * @desc    Get current user's services
 * @access  Private
 */
router.get('/me/services', authenticateToken, async (req, res) => {
  try {
    res.json(req.user.services);
  } catch (error) {
    logger.error('Get user services error:', error);
    res.status(500).json({ error: 'Failed to get user services' });
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (requires user:read permission)
 */
router.get('/', authenticateToken, requirePermission(USER_READ), async (req, res) => {
  try {
    // Get users from database (exclude sensitive fields)
    const users = await User.find().select('-password -refreshTokens -twoFactorAuth -passwordReset');

    res.json({ users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (requires user:read permission)
 */
router.get('/:id', authenticateToken, requirePermission(USER_READ), async (req, res) => {
  try {
    // Get user from database (exclude sensitive fields)
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens -twoFactorAuth -passwordReset');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (requires user:create permission)
 */
router.post('/', authenticateToken, requirePermission(USER_CREATE), async (req, res) => {
  try {
    const { email, password, name, company, role } = req.body;

    // Simple validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate password
    const passwordValidation = User.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Create new user
    const newUser = new User({
      email,
      password,
      name,
      company: company || '',
      role: role || 'user'
    });

    await newUser.save();

    logger.info('User created successfully', { email, createdBy: req.user.email });

    // Return user without sensitive data
    const userObject = newUser.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    delete userObject.twoFactorAuth;
    delete userObject.passwordReset;

    res.status(201).json({
      message: 'User created successfully',
      user: userObject
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user
 * @access  Private (requires user:update permission)
 */
router.put('/:id', authenticateToken, requirePermission(USER_UPDATE), async (req, res) => {
  try {
    const { name, company, role, permissions } = req.body;

    // Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (name) user.name = name;
    if (company !== undefined) user.company = company;

    // Only admins can update role and permissions
    if (req.user.role === 'admin') {
      if (role) user.role = role;
      if (permissions) user.permissions = permissions;
    }

    await user.save();

    logger.info('User updated successfully', {
      userId: user._id,
      updatedBy: req.user.email
    });

    // Return user without sensitive data
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.refreshTokens;
    delete userObject.twoFactorAuth;
    delete userObject.passwordReset;

    res.json({
      message: 'User updated successfully',
      user: userObject
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Private (requires user:delete permission)
 */
router.delete('/:id', authenticateToken, requirePermission(USER_DELETE), async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });

      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    logger.info('User deleted successfully', {
      userId: user._id,
      email: user.email,
      deletedBy: req.user.email
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
