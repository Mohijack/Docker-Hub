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

  // Get authentication headers
  async getAuthHeaders() {
    if (!this.token) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // List all stacks
  async listStacks() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.baseURL}/api/stacks`, { headers });
      return response.data;
    } catch (error) {
      logger.error('Failed to list stacks:', error.message);
      throw new Error('Failed to list Portainer stacks');
    }
  }

  // Get stack details
  async getStack(stackId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.baseURL}/api/stacks/${stackId}`, { headers });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get stack ${stackId}:`, error.message);
      throw new Error(`Failed to get Portainer stack ${stackId}`);
    }
  }

  // Create a new stack
  async createStack(name, composeFileContent) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${this.baseURL}/api/stacks`, {
        name,
        stackFileContent: composeFileContent
      }, { headers });

      logger.info(`Stack created: ${name}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to create stack ${name}:`, error.message);
      throw new Error(`Failed to create Portainer stack ${name}`);
    }
  }

  // Update an existing stack
  async updateStack(stackId, composeFileContent) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.put(`${this.baseURL}/api/stacks/${stackId}`, {
        stackFileContent: composeFileContent
      }, { headers });

      logger.info(`Stack updated: ${stackId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update stack ${stackId}:`, error.message);
      throw new Error(`Failed to update Portainer stack ${stackId}`);
    }
  }

  // Delete a stack
  async deleteStack(stackId) {
    try {
      const headers = await this.getAuthHeaders();
      await axios.delete(`${this.baseURL}/api/stacks/${stackId}`, { headers });

      logger.info(`Stack deleted: ${stackId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete stack ${stackId}:`, error.message);
      throw new Error(`Failed to delete Portainer stack ${stackId}`);
    }
  }
}

module.exports = new PortainerService();