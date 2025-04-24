#!/bin/bash

echo "Checking API routes in the backend container..."

echo "1. Checking health endpoint..."
docker exec beyondfire-cloud-api curl -v http://localhost:3000/health

echo "2. Checking API health endpoint..."
docker exec beyondfire-cloud-api curl -v http://localhost:3000/api/health

echo "3. Checking API test endpoint..."
docker exec beyondfire-cloud-api curl -v http://localhost:3000/api/test

echo "4. Checking API auth test endpoint..."
docker exec beyondfire-cloud-api curl -v http://localhost:3000/api/auth/test

echo "5. Checking API login endpoint..."
docker exec beyondfire-cloud-api curl -v -X POST -H "Content-Type: application/json" -d '{"email":"admin@beyondfire.cloud","password":"AdminPW!"}' http://localhost:3000/api/auth/login

echo "Check completed."
