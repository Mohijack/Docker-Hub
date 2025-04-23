const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const portainerService = require('../integrations/portainer');
const cloudflareService = require('../integrations/cloudflare');
const dockerServiceModel = require('../models/docker-service');
const userModel = require('../models/user');
const config = require('../utils/config');

// Path to bookings file
const BOOKINGS_FILE = path.join(__dirname, '../../../data/bookings.json');

class DeploymentService {
  constructor() {
    this.serverIp = config.server.ip;
  }

  // Deploy a booked service
  async deployService(bookingId) {
    try {
      // Get booking
      const booking = dockerServiceModel.getBookingById(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Generate docker-compose file
      const { success, composeContent, message } = dockerServiceModel.generateComposeFile(bookingId);
      if (!success) {
        return { success: false, message };
      }

      // Deploy to Portainer
      const stackName = `customer-${booking.userId.substring(0, 8)}-${booking.serviceId}`;

      // Authenticate with Portainer
      await portainerService.authenticate();

      // Create stack
      const stackResult = await portainerService.createStack(stackName, composeContent);

      // Update booking with stack ID
      dockerServiceModel.updateBookingStatus(bookingId, 'deploying', stackResult.Id);

      // Configure DNS if Cloudflare is enabled
      if (cloudflareService.isEnabled()) {
        const dnsResult = await cloudflareService.createDNSRecord(
          booking.domain,
          this.serverIp
        );

        if (dnsResult.success) {
          // Update booking with DNS record ID
          dockerServiceModel.updateBookingStatus(bookingId, 'active', null, dnsResult.result.id);
        } else {
          logger.error(`Failed to create DNS record for booking ${bookingId}:`, dnsResult.error);
          // Still mark as active even if DNS failed
          dockerServiceModel.updateBookingStatus(bookingId, 'active');
        }
      } else {
        // Mark as active even without DNS
        dockerServiceModel.updateBookingStatus(bookingId, 'active');
      }

      // Add service to user
      userModel.addServiceToUser(booking.userId, {
        id: booking.id,
        name: booking.customName,
        domain: booking.domain,
        port: booking.port,
        status: 'active',
        createdAt: booking.createdAt
      });

      return {
        success: true,
        message: 'Service deployed successfully',
        stackId: stackResult.Id,
        domain: booking.domain,
        port: booking.port
      };
    } catch (error) {
      logger.error(`Failed to deploy service for booking ${bookingId}:`, error);
      // Update booking status to failed
      dockerServiceModel.updateBookingStatus(bookingId, 'failed');
      return { success: false, message: `Deployment failed: ${error.message}` };
    }
  }

  // Suspend a deployed service
  async suspendService(bookingId) {
    try {
      // Get booking
      const booking = dockerServiceModel.getBookingById(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Check if booking has a stack ID
      if (!booking.stackId) {
        return { success: false, message: 'Service not deployed' };
      }

      // Authenticate with Portainer
      await portainerService.authenticate();

      // Delete stack
      await portainerService.deleteStack(booking.stackId);

      // Update booking status
      dockerServiceModel.updateBookingStatus(bookingId, 'suspended');

      return { success: true, message: 'Service suspended successfully' };
    } catch (error) {
      logger.error(`Failed to suspend service for booking ${bookingId}:`, error);
      return { success: false, message: `Suspension failed: ${error.message}` };
    }
  }

  // Resume a suspended service
  async resumeService(bookingId) {
    try {
      // Get booking
      const booking = dockerServiceModel.getBookingById(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Generate docker-compose file
      const { success, composeContent, message } = dockerServiceModel.generateComposeFile(bookingId);
      if (!success) {
        return { success: false, message };
      }

      // Deploy to Portainer
      const stackName = `customer-${booking.userId.substring(0, 8)}-${booking.serviceId}`;

      // Authenticate with Portainer
      await portainerService.authenticate();

      // Create stack
      const stackResult = await portainerService.createStack(stackName, composeContent);

      // Update booking with stack ID
      dockerServiceModel.updateBookingStatus(bookingId, 'active', stackResult.Id);

      return {
        success: true,
        message: 'Service resumed successfully',
        stackId: stackResult.Id
      };
    } catch (error) {
      logger.error(`Failed to resume service for booking ${bookingId}:`, error);
      return { success: false, message: `Resume failed: ${error.message}` };
    }
  }

  // Delete a service completely
  async deleteService(bookingId) {
    try {
      // Get booking
      const booking = dockerServiceModel.getBookingById(bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Check if booking has a stack ID
      if (booking.stackId) {
        // Authenticate with Portainer
        await portainerService.authenticate();

        // Delete stack
        await portainerService.deleteStack(booking.stackId);
      }

      // Delete DNS record if exists
      if (booking.dnsRecordId && cloudflareService.isEnabled()) {
        await cloudflareService.deleteDNSRecord(booking.dnsRecordId);
      }

      // Remove booking
      const bookings = dockerServiceModel.loadBookings();
      const updatedBookings = bookings.filter(b => b.id !== bookingId);
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(updatedBookings, null, 2));

      return { success: true, message: 'Service deleted successfully' };
    } catch (error) {
      logger.error(`Failed to delete service for booking ${bookingId}:`, error);
      return { success: false, message: `Deletion failed: ${error.message}` };
    }
  }
}

module.exports = new DeploymentService();
