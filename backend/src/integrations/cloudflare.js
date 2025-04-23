const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

class CloudflareService {
  constructor() {
    this.baseURL = 'https://api.cloudflare.com/client/v4';
    this.zoneId = config.cloudflare.zoneId;
    this.headers = {
      'Authorization': `Bearer ${config.cloudflare.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Rest of the code remains the same
}

module.exports = new CloudflareService();