const dotenv = require('dotenv');

// Load environment variables from .env file if not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  portainer: {
    url: process.env.PORTAINER_URL,
    username: process.env.PORTAINER_USERNAME,
    password: process.env.PORTAINER_PASSWORD
  },

  cloudflare: {
    // Temporarily disabled
    apiToken: null, // process.env.CLOUDFLARE_API_TOKEN,
    zoneId: null // process.env.CLOUDFLARE_ZONE_ID
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: process.env.TOKEN_EXPIRY || '1h',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },

  server: {
    ip: process.env.SERVER_IP
  },

  mongo: {
    uri: process.env.MONGO_URI,
    database: process.env.MONGO_DATABASE || 'beyondfire_cloud'
  },

  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true
  }
};
