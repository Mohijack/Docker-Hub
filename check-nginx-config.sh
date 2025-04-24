#!/bin/bash

echo "Checking Nginx configuration in the frontend container..."
docker exec beyondfire-cloud-frontend cat /etc/nginx/conf.d/default.conf

echo "Checking if Nginx is running..."
docker exec beyondfire-cloud-frontend ps aux | grep nginx

echo "Checking Nginx logs..."
docker exec beyondfire-cloud-frontend cat /var/log/nginx/error.log | tail -n 50

echo "Checking API connectivity from frontend container..."
docker exec beyondfire-cloud-frontend curl -v http://beyondfire-cloud-api:3000/api/health

echo "Checking API auth routes from frontend container..."
docker exec beyondfire-cloud-frontend curl -v http://beyondfire-cloud-api:3000/api/auth/test

echo "Checking API login route from frontend container..."
docker exec beyondfire-cloud-frontend curl -v -X POST -H "Content-Type: application/json" -d '{"email":"admin@beyondfire.cloud","password":"AdminPW!"}' http://beyondfire-cloud-api:3000/api/auth/login

echo "Check completed."
