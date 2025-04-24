# BeyondFire Cloud

Eine Cloud-Plattform für die Bereitstellung von Docker-Containern mit Fokus auf FE2 (Feuerwehr Einsatzleitsystem).

## Überblick

BeyondFire Cloud ist eine Webplattform, die es Benutzern ermöglicht, vorkonfigurierte Docker-Container zu buchen und bereitzustellen. Die Plattform bietet eine benutzerfreundliche Oberfläche für die Registrierung, Anmeldung und Verwaltung von Diensten.

## Funktionen

- **Benutzerauthentifizierung**: Sichere Registrierung und Anmeldung mit JWT und Refresh-Tokens
- **Dienstverwaltung**: Buchen und Bereitstellen von Docker-Containern
- **Admin-Bereich**: Verwaltung von Benutzern, Diensten und Buchungen
- **MongoDB-Integration**: Persistente Datenspeicherung für Benutzer, Dienste und Buchungen
- **Portainer-Integration**: Automatische Bereitstellung von Docker-Containern über Portainer

## Architektur

Die Anwendung besteht aus folgenden Komponenten:

1. **Frontend**: React.js-Anwendung mit moderner UI
2. **Backend**: Node.js-API mit Express
3. **Datenbank**: MongoDB für persistente Datenspeicherung
4. **Portainer**: Container-Orchestrierung für die Bereitstellung von Diensten

## Deployment

### Portainer-Stack-Deployment (empfohlen)

Die einfachste Methode zur Bereitstellung der Anwendung ist die Verwendung des Portainer-Stacks:

1. Loggen Sie sich in Ihre Portainer-Instanz ein
2. Navigieren Sie zu "Stacks" und klicken Sie auf "Add stack"
3. Geben Sie einen Namen für den Stack ein (z.B. "beyondfire-cloud")
4. Kopieren Sie den Inhalt der `portainer-stack.yml` Datei in das Web-Editor-Feld
5. Klicken Sie auf "Deploy the stack"

Alle Komponenten werden automatisch initialisiert, einschließlich:
- MongoDB-Datenbank mit Authentifizierung
- Automatische Initialisierung der Datenbank mit Standardkollektionen und -daten
- Backend-API mit Verbindung zur Datenbank
- Frontend-Weboberfläche

Weitere Informationen finden Sie in der [Portainer-Deployment-Anleitung](PORTAINER-DEPLOYMENT.md).

### Standardzugangsdaten

Nach dem Deployment können Sie sich mit folgenden Zugangsdaten anmelden:

- **Admin-Benutzer**: admin@beyondfire.cloud
- **Passwort**: AdminPW!

## Entwicklung

### Voraussetzungen

- Node.js (v18 oder höher)
- Docker und Docker Compose
- MongoDB

### Lokale Entwicklung

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/beyondfire-cloud.git
   cd beyondfire-cloud
   ```

2. Abhängigkeiten installieren:
   ```bash
   # Backend-Abhängigkeiten
   cd backend && npm install
   cd ..

   # Frontend-Abhängigkeiten
   cd frontend && npm install
   cd ..
   ```

3. Umgebungsvariablen konfigurieren:
   ```bash
   cp .env.example .env
   # Bearbeiten Sie die .env-Datei nach Bedarf
   ```

4. Entwicklungsserver starten:
   ```bash
   # Backend starten
   cd backend && npm run dev
   
   # Frontend starten (in einem anderen Terminal)
   cd frontend && npm start
   ```

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Weitere Informationen finden Sie in der [LICENSE](LICENSE)-Datei.
