
#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PORTAINER_URL" ] || [ -z "$PORTAINER_USERNAME" ] || [ -z "$PORTAINER_PASSWORD" ]; then
    echo "Error: Missing required Portainer credentials in .env file"
    exit 1
fi

# Login to Portainer and get JWT token
echo "Authenticating with Portainer..."
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${PORTAINER_USERNAME}\",\"password\":\"${PORTAINER_PASSWORD}\"}" \
    | grep -o '"jwt":"[^"]*' | sed 's/"jwt":"//')

if [ -z "$TOKEN" ]; then
    echo "Error: Failed to authenticate with Portainer"
    exit 1
fi

echo "Authentication successful"

# Check if stack already exists
STACK_NAME="beyondfire-cloud"
STACK_ID=$(curl -s -X GET "${PORTAINER_URL}/api/stacks" \
    -H "Authorization: Bearer ${TOKEN}" \
    | grep -o "\"Id\":[0-9]*,\"Name\":\"${STACK_NAME}\"" | grep -o "\"Id\":[0-9]*" | grep -o "[0-9]*")

# Prepare docker-compose file
COMPOSE_FILE=$(cat docker-compose.yml | sed 's/"/\\"/g' | sed 's/\n/\\n/g')

if [ -z "$STACK_ID" ]; then
    # Create new stack
    echo "Creating new stack: ${STACK_NAME}..."
    curl -X POST "${PORTAINER_URL}/api/stacks" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${STACK_NAME}\",\"stackFileContent\":\"${COMPOSE_FILE}\"}"
    echo "Stack created successfully"
else
    # Update existing stack
    echo "Updating existing stack: ${STACK_NAME} (ID: ${STACK_ID})..."
    curl -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"stackFileContent\":\"${COMPOSE_FILE}\"}"
    echo "Stack updated successfully"
fi

echo "Deployment completed"