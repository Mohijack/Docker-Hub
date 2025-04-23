const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

// In a real application, this would be a database
// For this demo, we'll use a simple JSON file
const SERVICES_FILE = path.join(__dirname, '../../../data/services.json');
const BOOKINGS_FILE = path.join(__dirname, '../../../data/bookings.json');

// Ensure data directory exists
const dataDir = path.dirname(SERVICES_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize services file if it doesn't exist
if (!fs.existsSync(SERVICES_FILE)) {
  // Create some default services
  const defaultServices = [
    {
      id: 'fe2-docker',
      name: 'FE2 - Feuerwehr Einsatzleitsystem',
      description: 'Alamos FE2 - Professionelles Einsatzleitsystem für Feuerwehren',
      price: 19.99,
      image: 'alamosgmbh/fe2:latest',
      resources: {
        cpu: 2,
        memory: '2GB',
        storage: '10GB'
      },
      composeTemplate: `version: '3.7'

services:
  fe2_database:
    image: mongo:4.4.29
    container_name: fe2_database_{{UNIQUE_ID}}
    logging:
      driver: none
    ports:
      - "27017:27017"
    volumes:
      - ./data/fe2_{{UNIQUE_ID}}/config/database/configdb:/data/configdb
      - ./data/fe2_{{UNIQUE_ID}}/config/database:/data/db
    restart: unless-stopped

  fe2_app:
    image: alamosgmbh/fe2:2.36.100
    container_name: fe2_app_{{UNIQUE_ID}}
    hostname: fe2-{{DOMAIN}}
    environment:
      - FE2_EMAIL={{FE2_EMAIL}}
      - FE2_PASSWORD={{FE2_PASSWORD}}
      - FE2_ACTIVATION_NAME=fe2_{{UNIQUE_ID}}
      - FE2_IP_MONGODB=fe2_database_{{UNIQUE_ID}}
      - FE2_PORT_MONGODB=27017
    ports:
      - "{{PORT}}:83"
    volumes:
      - ./data/fe2_{{UNIQUE_ID}}/logs:/Logs
      - ./data/fe2_{{UNIQUE_ID}}/config:/Config
    restart: unless-stopped
    healthcheck:
      test: curl --fail http://localhost:83/ || exit 1
      interval: 60s
      retries: 3
      start_period: 60s
      timeout: 10s
    depends_on:
      - fe2_database

  fe2_nginx:
    image: nginx:alpine
    container_name: fe2_nginx_{{UNIQUE_ID}}
    ports:
      - "{{PORT}}:80"
    volumes:
      - ./data/fe2_{{UNIQUE_ID}}/nginx/conf:/etc/nginx/conf.d
    restart: unless-stopped
    depends_on:
      - fe2_app
`
    }
  ];

  fs.writeFileSync(SERVICES_FILE, JSON.stringify(defaultServices, null, 2));
}

// Initialize bookings file if it doesn't exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
}

class DockerServiceModel {
  constructor() {
    this.services = this.loadServices();
    this.bookings = this.loadBookings();
  }

  loadServices() {
    try {
      const data = fs.readFileSync(SERVICES_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading services:', error);
      return [];
    }
  }

  loadBookings() {
    try {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading bookings:', error);
      return [];
    }
  }

  saveBookings() {
    try {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(this.bookings, null, 2));
    } catch (error) {
      logger.error('Error saving bookings:', error);
    }
  }

  // Get all available services
  getAllServices() {
    return this.services;
  }

  // Get service by ID
  getServiceById(id) {
    return this.services.find(service => service.id === id);
  }

  // Check if a domain is already in use
  isDomainInUse(domain) {
    return this.bookings.some(booking => booking.domain === domain);
  }

  // Book a service
  bookService(userId, serviceId, customDomain, customName) {
    const service = this.getServiceById(serviceId);
    if (!service) {
      return { success: false, message: 'Service not found' };
    }

    // Generate a unique port number between 10000 and 20000
    const port = Math.floor(Math.random() * 10000) + 10000;

    // Generate a unique subdomain if not provided
    let subdomain = customDomain || `${serviceId}-${crypto.randomBytes(3).toString('hex')}`;
    let domain = `${subdomain}.beyondfire.cloud`;

    // Check if the domain is already in use
    if (customDomain) {
      if (this.isDomainInUse(domain)) {
        return { success: false, message: `Die Domain '${domain}' wird bereits verwendet. Bitte wählen Sie eine andere Subdomain.` };
      }
    } else {
      // If auto-generated, ensure it's unique
      let attempts = 0;
      while (this.isDomainInUse(domain) && attempts < 5) {
        subdomain = `${serviceId}-${crypto.randomBytes(3).toString('hex')}`;
        domain = `${subdomain}.beyondfire.cloud`;
        attempts++;
      }

      if (this.isDomainInUse(domain)) {
        return { success: false, message: 'Konnte keine eindeutige Domain generieren. Bitte versuchen Sie es später erneut.' };
      }
    }

    // Create booking
    const booking = {
      id: crypto.randomUUID(),
      userId,
      serviceId,
      serviceName: service.name,
      customName: customName || service.name,
      domain,
      port,
      status: 'pending', // pending, active, suspended
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      stackId: null, // Will be set when deployed
      dnsRecordId: null // Will be set when DNS is configured
    };

    // Add booking
    this.bookings.push(booking);
    this.saveBookings();

    return { success: true, booking };
  }

  // Get user bookings
  getUserBookings(userId) {
    return this.bookings.filter(booking => booking.userId === userId);
  }

  // Get booking by ID
  getBookingById(id) {
    return this.bookings.find(booking => booking.id === id);
  }

  // Update booking status
  updateBookingStatus(id, status, stackId = null, dnsRecordId = null) {
    const index = this.bookings.findIndex(booking => booking.id === id);
    if (index === -1) {
      return { success: false, message: 'Booking not found' };
    }

    // Update booking
    this.bookings[index].status = status;
    if (stackId) this.bookings[index].stackId = stackId;
    if (dnsRecordId) this.bookings[index].dnsRecordId = dnsRecordId;

    this.saveBookings();

    return { success: true, booking: this.bookings[index] };
  }

  // Delete booking
  deleteBooking(id) {
    const index = this.bookings.findIndex(booking => booking.id === id);
    if (index === -1) {
      return { success: false, message: 'Booking not found' };
    }

    // Remove booking from array
    this.bookings.splice(index, 1);

    // Save updated bookings
    this.saveBookings();

    return { success: true, message: 'Booking deleted successfully' };
  }

  // Generate docker-compose file for a booking
  generateComposeFile(bookingId) {
    const booking = this.getBookingById(bookingId);
    if (!booking) {
      return { success: false, message: 'Booking not found' };
    }

    const service = this.getServiceById(booking.serviceId);
    if (!service) {
      return { success: false, message: 'Service not found' };
    }

    // Replace placeholders in template
    let composeContent = service.composeTemplate
      .replace(/{{PORT}}/g, booking.port)
      .replace(/{{DOMAIN}}/g, booking.domain);

    // Special handling for FE2 service
    if (booking.serviceId === 'fe2-docker') {
      // Generate a unique ID for the FE2 instance
      const uniqueId = booking.id.substring(0, 8);

      // Replace FE2-specific placeholders
      composeContent = composeContent
        .replace(/{{UNIQUE_ID}}/g, uniqueId)
        .replace(/{{FE2_EMAIL}}/g, 'admin@beyondfire.cloud')
        .replace(/{{FE2_PASSWORD}}/g, 'BeyondFire2024!');

      // Create nginx configuration file
      try {
        // Create directories if they don't exist
        const nginxConfigDir = `./data/fe2_${uniqueId}/nginx/conf`;
        if (!fs.existsSync(nginxConfigDir)) {
          fs.mkdirSync(nginxConfigDir, { recursive: true });
        }

        // Read nginx configuration template
        const nginxConfigTemplate = fs.readFileSync('./backend/src/templates/fe2-nginx.conf', 'utf8');

        // Replace placeholders in nginx configuration
        const nginxConfig = nginxConfigTemplate
          .replace(/{{UNIQUE_ID}}/g, uniqueId)
          .replace(/{{DOMAIN}}/g, booking.domain);

        // Write nginx configuration file
        fs.writeFileSync(`${nginxConfigDir}/default.conf`, nginxConfig);

        logger.info(`Nginx configuration file created for booking ${bookingId}`);
      } catch (error) {
        logger.error(`Failed to create nginx configuration file for booking ${bookingId}:`, error);
      }
    }

    return { success: true, composeContent };
  }
}

module.exports = new DockerServiceModel();
