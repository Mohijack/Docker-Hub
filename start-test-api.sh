#!/bin/bash

echo "Starting test API server..."
docker exec -d beyondfire-cloud-api node /app/backend/src/test-api.js

echo "Waiting for the server to start..."
sleep 2

echo "Testing the server..."
curl -v http://localhost:3001/health

echo "Test API server started on port 3001."
