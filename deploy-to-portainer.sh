#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguration
PORTAINER_URL=$(grep PORTAINER_URL .env | cut -d '=' -f2)
PORTAINER_USERNAME=$(grep PORTAINER_USERNAME .env | cut -d '=' -f2)
PORTAINER_PASSWORD=$(grep PORTAINER_PASSWORD .env | cut -d '=' -f2)
STACK_NAME="beyondfire-cloud"
STACK_FILE="portainer-stack.yml"

echo -e "${YELLOW}Deploying BeyondFire Cloud to Portainer...${NC}"
echo -e "Portainer URL: ${PORTAINER_URL}"
echo -e "Stack Name: ${STACK_NAME}"

# Prüfen, ob die Datei existiert
if [ ! -f "$STACK_FILE" ]; then
    echo -e "${RED}Error: Stack file $STACK_FILE not found!${NC}"
    exit 1
fi

# Authentifizierung bei Portainer
echo -e "${YELLOW}Authenticating with Portainer...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${PORTAINER_USERNAME}\",\"password\":\"${PORTAINER_PASSWORD}\"}")

# Prüfen, ob die Authentifizierung erfolgreich war
if [[ "$AUTH_RESPONSE" != *"jwt"* ]]; then
    echo -e "${RED}Authentication failed! Response: $AUTH_RESPONSE${NC}"
    exit 1
fi

# JWT-Token extrahieren
JWT=$(echo $AUTH_RESPONSE | grep -o '"jwt":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}Authentication successful!${NC}"

# Endpunkte abrufen
echo -e "${YELLOW}Getting endpoints...${NC}"
ENDPOINTS_RESPONSE=$(curl -s -X GET "${PORTAINER_URL}/api/endpoints" \
    -H "Authorization: Bearer ${JWT}")

# Erste Endpunkt-ID verwenden
ENDPOINT_ID=$(echo $ENDPOINTS_RESPONSE | grep -o '"Id":[0-9]*' | head -1 | cut -d':' -f2)
echo -e "Using endpoint ID: ${ENDPOINT_ID}"

# Prüfen, ob der Stack bereits existiert
echo -e "${YELLOW}Checking if stack already exists...${NC}"
STACKS_RESPONSE=$(curl -s -X GET "${PORTAINER_URL}/api/stacks" \
    -H "Authorization: Bearer ${JWT}")

STACK_EXISTS=$(echo $STACKS_RESPONSE | grep -o "\"Name\":\"${STACK_NAME}\"")
STACK_ID=$(echo $STACKS_RESPONSE | grep -o "\"Name\":\"${STACK_NAME}\".*?\"Id\":[0-9]*" | grep -o '"Id":[0-9]*' | cut -d':' -f2)

# Stack-Datei einlesen
STACK_CONTENT=$(cat $STACK_FILE)

if [ -n "$STACK_EXISTS" ]; then
    echo -e "${YELLOW}Stack already exists with ID: ${STACK_ID}. Updating...${NC}"
    
    # Stack aktualisieren
    UPDATE_RESPONSE=$(curl -s -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}?endpointId=${ENDPOINT_ID}" \
        -H "Authorization: Bearer ${JWT}" \
        -H "Content-Type: application/json" \
        -d "{\"stackFileContent\":\"${STACK_CONTENT//\"/\\\"}\",\"env\":[]}")
    
    if [[ "$UPDATE_RESPONSE" == *"Id"* ]]; then
        echo -e "${GREEN}Stack updated successfully!${NC}"
    else
        echo -e "${RED}Failed to update stack! Response: $UPDATE_RESPONSE${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Stack does not exist. Creating new stack...${NC}"
    
    # Stack erstellen
    CREATE_RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/stacks/create/standalone/string?endpointId=${ENDPOINT_ID}" \
        -H "Authorization: Bearer ${JWT}" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${STACK_NAME}\",\"stackFileContent\":\"${STACK_CONTENT//\"/\\\"}\",\"env\":[]}")
    
    if [[ "$CREATE_RESPONSE" == *"Id"* ]]; then
        echo -e "${GREEN}Stack created successfully!${NC}"
    else
        echo -e "${RED}Failed to create stack! Response: $CREATE_RESPONSE${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "You can access the application at: http://${SERVER_IP}"
echo -e "API is available at: http://${SERVER_IP}:3000"
echo -e "MongoDB is available at: mongodb://${MONGO_ROOT_USERNAME}:****@${SERVER_IP}:27017/${MONGO_DATABASE}?authSource=admin"
