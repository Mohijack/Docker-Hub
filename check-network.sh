#!/bin/bash

echo "Checking network connectivity between containers..."

echo "1. Checking if frontend container can reach API container..."
docker exec beyondfire-cloud-frontend ping -c 3 beyondfire-cloud-api

echo "2. Checking if API container can reach frontend container..."
docker exec beyondfire-cloud-api ping -c 3 beyondfire-cloud-frontend

echo "3. Checking if API container can reach MongoDB container..."
docker exec beyondfire-cloud-api ping -c 3 beyondfire-mongodb

echo "4. Checking if API container is listening on port 3000..."
docker exec beyondfire-cloud-api netstat -tulpn | grep 3000

echo "5. Checking API health endpoint from frontend container..."
docker exec beyondfire-cloud-frontend curl -v http://beyondfire-cloud-api:3000/api/health

echo "6. Checking API auth endpoint from frontend container..."
docker exec beyondfire-cloud-frontend curl -v -X POST -H "Content-Type: application/json" -d '{"email":"admin@beyondfire.cloud","password":"AdminPW!"}' http://beyondfire-cloud-api:3000/api/auth/login

echo "Network connectivity check completed."
