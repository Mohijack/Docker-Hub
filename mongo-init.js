// MongoDB initialization script
// This script will be executed when the MongoDB container starts for the first time

// Connect to admin database with root credentials
db = db.getSiblingDB('admin');

// Check if the database already exists
const dbExists = db.getCollectionNames().includes('system.users');

if (!dbExists) {
  print('Initializing MongoDB...');

  // Create a database user for the application
  db.createUser({
    user: 'admin',
    pwd: 'BeyondFireAdmin2023!',
    roles: [
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' }
    ]
  });
  print('Created admin user for authentication');

  // Create the application database
  const appDb = db.getSiblingDB('beyondfire_cloud');

  // Create collections
  appDb.createCollection('users');
  print('Created users collection');

  // Create default admin user
  appDb.users.insertOne({
    email: 'admin@beyondfire.cloud',
    name: 'Admin',
    password: '$argon2id$v=19$m=65536,t=3,p=1$tnFQzxFRMuYPJUOLlJQMYQ$3Gg9PJSGSKGjEmKvx7b0yNGNGFHXpZ4IGIvYZjAOvFo', // AdminPW!
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('Created default admin user');

  // Create services collection
  appDb.createCollection('services');
  print('Created services collection');

  // Create default FE2 service
  appDb.services.insertOne({
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
  appDb.createCollection('bookings');
  print('Created bookings collection');

  // Create logs collection
  appDb.createCollection('logs');
  print('Created logs collection');

  // Create a specific user for the beyondfire_cloud database
  db.createUser({
    user: 'beyondfire',
    pwd: 'BeyondFireAdmin2023!',
    roles: [
      { role: 'readWrite', db: 'beyondfire_cloud' },
      { role: 'dbAdmin', db: 'beyondfire_cloud' }
    ]
  });
  print('Created beyondfire user for beyondfire_cloud database');

  print('MongoDB initialization completed successfully');
} else {
  print('MongoDB already initialized, skipping initialization');
}
