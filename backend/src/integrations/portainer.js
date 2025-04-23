const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');

class PortainerService {
  constructor() {
    // Stelle sicher, dass die URL kein abschließendes Schrägstrich hat
    this.baseURL = config.portainer.url.endsWith('/')
      ? config.portainer.url.slice(0, -1)
      : config.portainer.url;
    this.token = null;

    logger.info(`Portainer URL: ${this.baseURL}`);
  }

  async authenticate() {
    try {
      logger.info(`Authenticating with Portainer at ${this.baseURL}`);
      logger.info(`Using username: ${config.portainer.username}`);

      // Direkte Authentifizierung mit dem Standard-JSON-Format (lowercase)
      // Dies funktioniert mit Portainer 2.27.4
      const response = await axios.post(`${this.baseURL}/api/auth`, {
        username: config.portainer.username,
        password: config.portainer.password
      });

      this.token = response.data.jwt;
      logger.info('Portainer authentication successful');
      return this.token;
    } catch (error) {
      logger.error('Portainer authentication failed:', error.message);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
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
      logger.info(`Creating stack: ${name}`);

      const headers = await this.getAuthHeaders();
      logger.info('Got authentication headers');

      // Prüfen, ob die Endpunkte erreichbar sind
      try {
        const endpointsResponse = await axios.get(`${this.baseURL}/api/endpoints`, { headers });
        logger.info(`Found ${endpointsResponse.data.length || 0} endpoints`);
      } catch (endpointsError) {
        logger.error('Failed to get endpoints:', endpointsError.message);
      }

      // Stack erstellen
      const response = await axios.post(`${this.baseURL}/api/stacks`, {
        name,
        stackFileContent: composeFileContent,
        // Für Portainer 2.x müssen wir den Endpunkt angeben
        endpointId: 1 // Standard-Endpunkt-ID
      }, { headers });

      logger.info(`Stack created: ${name}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to create stack ${name}:`, error.message);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to create Portainer stack ${name}: ${error.message}`);
    }
  }

  // Update an existing stack
  async updateStack(stackId, composeFileContent) {
    try {
      logger.info(`Updating stack: ${stackId}`);

      const headers = await this.getAuthHeaders();
      logger.info('Got authentication headers');

      const response = await axios.put(`${this.baseURL}/api/stacks/${stackId}`, {
        stackFileContent: composeFileContent,
        // Für Portainer 2.x müssen wir den Endpunkt angeben
        endpointId: 1 // Standard-Endpunkt-ID
      }, { headers });

      logger.info(`Stack updated: ${stackId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update stack ${stackId}:`, error.message);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to update Portainer stack ${stackId}: ${error.message}`);
    }
  }

  // Delete a stack
  async deleteStack(stackId) {
    try {
      logger.info(`Deleting stack: ${stackId}`);

      const headers = await this.getAuthHeaders();
      logger.info('Got authentication headers');

      // Für Portainer 2.x müssen wir den Endpunkt angeben
      await axios.delete(`${this.baseURL}/api/stacks/${stackId}`, {
        headers,
        params: {
          endpointId: 1 // Standard-Endpunkt-ID
        }
      });

      logger.info(`Stack deleted: ${stackId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete stack ${stackId}:`, error.message);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to delete Portainer stack ${stackId}: ${error.message}`);
    }
  }
}

module.exports = new PortainerService();