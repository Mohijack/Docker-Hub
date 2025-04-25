const authService = require('../services/auth.service');
const { logger } = require('../utils/logger');

/**
 * Middleware to check if setup is required
 * If no users exist in the database, redirects to the setup page
 * Excludes setup routes and static assets from the check
 */
const setupRequired = async (req, res, next) => {
  // Skip check for setup routes and static assets
  if (
    req.path.startsWith('/api/setup') || 
    req.path.startsWith('/static') ||
    req.path.startsWith('/assets') ||
    req.path === '/favicon.ico' ||
    req.path === '/setup'
  ) {
    return next();
  }
  
  try {
    const result = await authService.checkUsersExist();
    
    if (!result.success) {
      logger.error('Setup check error:', result.message);
      return next();
    }
    
    if (!result.usersExist) {
      // If API request, return 307 Temporary Redirect with location header
      if (req.path.startsWith('/api/')) {
        return res.status(307).json({ 
          setupRequired: true,
          redirect: '/setup',
          message: 'Setup required'
        });
      }
      
      // For regular requests, redirect to setup page
      return res.redirect('/setup');
    }
    
    next();
  } catch (error) {
    logger.error('Setup middleware error:', error);
    next();
  }
};

module.exports = { setupRequired };
