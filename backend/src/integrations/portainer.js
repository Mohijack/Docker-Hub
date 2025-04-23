const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

class PortainerService {
  constructor() {
    this.baseURL = config.portainer.url;
    this.token = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth`, {
        username: config.portainer.username,
        password: config.portainer.password
      });
      
      this.token = response.data.jwt;
      return this.token;
    } catch (error) {
      logger.error('Portainer authentication failed:', error.message);
      throw new Error('Failed to authenticate with Portainer');
    }
  }

  // Rest of the code remains the same
}

module.exports = new PortainerService();