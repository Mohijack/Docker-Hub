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
      id: 'wordpress-basic',
      name: 'WordPress Basic',
      description: 'Basic WordPress installation with MySQL',
      price: 5.99,
      image: 'wordpress:latest',
      resources: {
        cpu: 1,
        memory: '1GB',
        storage: '10GB'
      },
      composeTemplate: `
version: '3.8'
services:
  wordpress:
    image: wordpress:latest
    restart: always
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
    ports:
      - "{{PORT}}:80"
    volumes:
      - wordpress_data:/var/www/html
  
  db:
    image: mysql:5.7
    restart: always
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
      MYSQL_RANDOM_ROOT_PASSWORD: '1'
    volumes:
      - db_data:/var/lib/mysql

volumes:
  wordpress_data:
  db_data:
`
    },
    {
      id: 'nextcloud',
      name: 'Nextcloud',
      description: 'Self-hosted productivity platform',
      price: 8.99,
      image: 'nextcloud:latest',
      resources: {
        cpu: 2,
        memory: '2GB',
        storage: '20GB'
      },
      composeTemplate: `
version: '3.8'
services:
  nextcloud:
    image: nextcloud:latest
    restart: always
    ports:
      - "{{PORT}}:80"
    volumes:
      - nextcloud_data:/var/www/html
    environment:
      - MYSQL_HOST=db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=nextcloud

  db:
    image: mariadb:10.5
    restart: always
    volumes:
      - db_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=nextcloud
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=nextcloud

volumes:
  nextcloud_data:
  db_data:
`
    },
    {
      id: 'ghost-blog',
      name: 'Ghost Blog',
      description: 'Professional publishing platform',
      price: 6.99,
      image: 'ghost:latest',
      resources: {
        cpu: 1,
        memory: '1GB',
        storage: '5GB'
      },
      composeTemplate: `
version: '3.8'
services:
  ghost:
    image: ghost:latest
    restart: always
    ports:
      - "{{PORT}}:2368"
    volumes:
      - ghost_data:/var/lib/ghost/content
    environment:
      - url=http://{{DOMAIN}}
      - database__client=mysql
      - database__connection__host=db
      - database__connection__user=ghost
      - database__connection__password=ghost
      - database__connection__database=ghost

  db:
    image: mysql:5.7
    restart: always
    volumes:
      - db_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=ghost
      - MYSQL_DATABASE=ghost
      - MYSQL_USER=ghost
      - MYSQL_PASSWORD=ghost

volumes:
  ghost_data:
  db_data:
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

  // Book a service
  bookService(userId, serviceId, customDomain, customName) {
    const service = this.getServiceById(serviceId);
    if (!service) {
      return { success: false, message: 'Service not found' };
    }

    // Generate a unique port number between 10000 and 20000
    const port = Math.floor(Math.random() * 10000) + 10000;
    
    // Generate a unique subdomain if not provided
    const subdomain = customDomain || `${serviceId}-${crypto.randomBytes(3).toString('hex')}`;
    
    // Create booking
    const booking = {
      id: crypto.randomUUID(),
      userId,
      serviceId,
      serviceName: service.name,
      customName: customName || service.name,
      domain: `${subdomain}.beyondfire.cloud`,
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

    return { success: true, composeContent };
  }
}

module.exports = new DockerServiceModel();
