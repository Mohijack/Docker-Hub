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
    this.enabled = false; // Temporarily disabled
  }

  // Add a method to check if Cloudflare is enabled
  isEnabled() {
    return this.enabled && this.zoneId && config.cloudflare.apiToken;
  }

  // Modify other methods to check if enabled before making API calls
  async createDNSRecord(name, content, type = 'A', proxied = true) {
    if (!this.isEnabled()) {
      logger.info('Cloudflare integration is disabled. Skipping DNS record creation.');
      return { success: false, disabled: true };
    }
    
    // Original implementation...
  }

  // Modify other methods similarly...
}

module.exports = new CloudflareService();

