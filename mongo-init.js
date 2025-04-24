// MongoDB initialization script
// This script will be executed when the MongoDB container starts for the first time

// Connect to admin database with root credentials (already authenticated by Docker)
db = db.getSiblingDB('admin');

// Create a database user for the application if it doesn't exist
const adminUserExists = db.getUser('admin');
if (!adminUserExists) {
  print('Creating admin user...');
  db.createUser({
    user: 'admin',
    pwd: 'BeyondFireAdmin2023!',
    roles: [
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' }
    ]
  });
  print('Admin user created successfully');
}

// Connect to the application database
db = db.getSiblingDB('beyondfire_cloud');

// Check if the database already exists
const dbExists = db.getCollectionNames().length > 0;

if (!dbExists) {
  print('Initializing MongoDB...');

  // Create collections
  db.createCollection('users');
  print('Created users collection');

  // Create default admin user
  db.users.insertOne({
    email: 'admin@beyondfire.cloud',
    name: 'Admin',
    password: '$argon2id$v=19$m=65536,t=3,p=1$tnFQzxFRMuYPJUOLlJQMYQ$3Gg9PJSGSKGjEmKvx7b0yNGNGFHXpZ4IGIvYZjAOvFo', // AdminPW!
    role: 'admin',
    permissions: [
      // User permissions
      'user:read', 'user:create', 'user:update', 'user:delete',
      // Service permissions
      'service:read', 'service:create', 'service:update', 'service:delete',
      // Booking permissions
      'booking:read', 'booking:create', 'booking:update', 'booking:delete',
      // Admin permissions
      'admin:access', 'admin:logs', 'admin:settings'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('Created default admin user');

  // Create services collection
  db.createCollection('services');
  print('Created services collection');

  // Create default FE2 service
  db.services.insertOne({
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
    composeTemplate: 'version: \'3\'\nservices:\n  fe2_database:\n    image: mongo:4.4.29\n    ports:\n      - 27017\n    volumes:\n      - fe2_db_data:/data/db\n    restart: unless-stopped\n\n  fe2_app:\n    image: alamosgmbh/fe2:2.36.100\n    environment:\n      - FE2_EMAIL={{FE2_EMAIL}}\n      - FE2_PASSWORD={{FE2_PASSWORD}}\n      - FE2_ACTIVATION_NAME=fe2_{{UNIQUE_ID}}\n      - FE2_IP_MONGODB=fe2_database\n      - FE2_PORT_MONGODB=27017\n    ports:\n      - 83\n    volumes:\n      - fe2_logs:/Logs\n      - fe2_config:/Config\n    restart: unless-stopped\n    depends_on:\n      - fe2_database\n\n  fe2_nginx:\n    image: nginx:alpine\n    ports:\n      - \'{{PORT}}:80\'\n    environment:\n      - NGINX_HOST=localhost\n    command: sh -c \'echo \"server { listen 80; location / { proxy_pass http://fe2_app:83; } }\" > /etc/nginx/conf.d/default.conf && nginx -g \"daemon off;\"\'\n    restart: unless-stopped\n    depends_on:\n      - fe2_app\n\nvolumes:\n  fe2_db_data:\n  fe2_logs:\n  fe2_config:\n',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('Created default FE2 service');

  // Create bookings collection
  db.createCollection('bookings');
  print('Created bookings collection');

  // Create logs collection
  db.createCollection('logs');
  print('Created logs collection');

  print('MongoDB initialization completed successfully');
} else {
  print('MongoDB already initialized, skipping initialization');
}
