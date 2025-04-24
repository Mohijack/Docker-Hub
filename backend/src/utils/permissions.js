/**
 * Permission constants
 * Defines all available permissions in the system
 */

// User permissions
const USER_READ = 'user:read';
const USER_CREATE = 'user:create';
const USER_UPDATE = 'user:update';
const USER_DELETE = 'user:delete';

// Service permissions
const SERVICE_READ = 'service:read';
const SERVICE_CREATE = 'service:create';
const SERVICE_UPDATE = 'service:update';
const SERVICE_DELETE = 'service:delete';

// Booking permissions
const BOOKING_READ = 'booking:read';
const BOOKING_CREATE = 'booking:create';
const BOOKING_UPDATE = 'booking:update';
const BOOKING_DELETE = 'booking:delete';

// Admin permissions
const ADMIN_ACCESS = 'admin:access';
const ADMIN_LOGS = 'admin:logs';
const ADMIN_SETTINGS = 'admin:settings';

/**
 * Role-based permission sets
 */
const ROLE_PERMISSIONS = {
  user: [
    USER_READ,
    SERVICE_READ,
    BOOKING_READ,
    BOOKING_CREATE,
    BOOKING_UPDATE
  ],
  support: [
    USER_READ,
    SERVICE_READ,
    BOOKING_READ,
    BOOKING_UPDATE,
    ADMIN_LOGS
  ],
  manager: [
    USER_READ,
    USER_CREATE,
    USER_UPDATE,
    SERVICE_READ,
    SERVICE_CREATE,
    SERVICE_UPDATE,
    BOOKING_READ,
    BOOKING_CREATE,
    BOOKING_UPDATE,
    BOOKING_DELETE,
    ADMIN_ACCESS,
    ADMIN_LOGS
  ],
  admin: [
    USER_READ,
    USER_CREATE,
    USER_UPDATE,
    USER_DELETE,
    SERVICE_READ,
    SERVICE_CREATE,
    SERVICE_UPDATE,
    SERVICE_DELETE,
    BOOKING_READ,
    BOOKING_CREATE,
    BOOKING_UPDATE,
    BOOKING_DELETE,
    ADMIN_ACCESS,
    ADMIN_LOGS,
    ADMIN_SETTINGS
  ]
};

/**
 * Get permissions for a role
 * @param {string} role - User role
 * @returns {Array} Array of permissions
 */
const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if the role has the permission
 */
const roleHasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

module.exports = {
  // Permission constants
  USER_READ,
  USER_CREATE,
  USER_UPDATE,
  USER_DELETE,
  SERVICE_READ,
  SERVICE_CREATE,
  SERVICE_UPDATE,
  SERVICE_DELETE,
  BOOKING_READ,
  BOOKING_CREATE,
  BOOKING_UPDATE,
  BOOKING_DELETE,
  ADMIN_ACCESS,
  ADMIN_LOGS,
  ADMIN_SETTINGS,
  
  // Role-based permissions
  ROLE_PERMISSIONS,
  
  // Helper functions
  getPermissionsForRole,
  roleHasPermission
};
