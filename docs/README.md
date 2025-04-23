# BeyondFire Cloud

Eine Plattform zur Verwaltung von Docker-Containern über Portainer mit automatischer DNS-Konfiguration via Cloudflare.

## Deployment mit Portainer

1. Loggen Sie sich in Ihre Portainer-Instanz ein
2. Navigieren Sie zu "Stacks" und klicken Sie auf "Add stack"
3. Geben Sie einen Namen für den Stack ein (z.B. "beyondfire-cloud")
4. Laden Sie die `docker-compose.yml` Datei hoch oder fügen Sie den Inhalt in das Web-Editor-Feld ein
5. Konfigurieren Sie die Umgebungsvariablen:
   - `PORTAINER_URL`: URL Ihrer Portainer-Instanz (z.B. http://localhost:9000)
   - `PORTAINER_USERNAME`: Ihr Portainer-Benutzername
   - `PORTAINER_PASSWORD`: Ihr Portainer-Passwort
   - `CLOUDFLARE_API_TOKEN`: Ihr Cloudflare API-Token
   - `CLOUDFLARE_ZONE_ID`: Ihre Cloudflare Zone-ID
   - `JWT_SECRET`: Ein sicherer Schlüssel für JWT-Token
   - `SERVER_IP`: Die öffentliche IP-Adresse Ihres Servers
6. Klicken Sie auf "Deploy the stack"

## Lokale Entwicklung

### Voraussetzungen
- Node.js (v18 oder höher)
- Docker und Docker Compose

### Setup
1. Klonen Sie das Repository
2. Erstellen Sie eine `.env`-Datei basierend auf `.env.example`
3. Installieren Sie die Abhängigkeiten:
   ```
   cd backend && npm install
   cd frontend && npm install
   ```
4. Starten Sie die Entwicklungsserver:
   ```
   # Backend
   cd backend && npm run dev
   
   # Frontend
   cd frontend && npm start
   ```

## Docker-Build
```
docker-compose build
docker-compose up -d
```

