# BeyondFire Cloud - Portainer Deployment

Diese Anleitung beschreibt, wie Sie BeyondFire Cloud mit MongoDB über Portainer deployen können.

## Voraussetzungen

- Portainer-Instanz (Version 2.0 oder höher)
- Docker-Host mit Internetzugang

## Vollautomatisches Deployment

Die `portainer-stack.yml` ist so konfiguriert, dass sie ein vollautomatisches Deployment ermöglicht, ohne dass manuelle Skripte ausgeführt werden müssen. Alle notwendigen Komponenten werden automatisch initialisiert:

1. MongoDB-Datenbank mit Authentifizierung
2. Automatische Initialisierung der Datenbank mit Standardkollektionen und -daten
3. Backend-API mit Verbindung zur Datenbank
4. Frontend-Weboberfläche

## Deployment-Schritte

1. Loggen Sie sich in Ihre Portainer-Instanz ein
2. Navigieren Sie zu "Stacks" und klicken Sie auf "Add stack"
3. Geben Sie einen Namen für den Stack ein (z.B. "beyondfire-cloud")
4. Kopieren Sie den Inhalt der `portainer-stack.yml` Datei in das Web-Editor-Feld
5. (Optional) Konfigurieren Sie die Umgebungsvariablen:
   - Die Stack-Datei enthält Standardwerte für alle Variablen, sodass keine manuelle Konfiguration erforderlich ist
   - Sie können jedoch die Standardwerte überschreiben, indem Sie die entsprechenden Umgebungsvariablen setzen
6. Klicken Sie auf "Deploy the stack"

## Nach dem Deployment

Nach erfolgreichem Deployment können Sie auf die Anwendung zugreifen:

- Frontend: `http://<SERVER_IP>`
- API: `http://<SERVER_IP>:3000`
- MongoDB: `mongodb://<MONGO_ROOT_USERNAME>:<MONGO_ROOT_PASSWORD>@<SERVER_IP>:27017/<MONGO_DATABASE>?authSource=admin`

## Fehlerbehebung

### MongoDB startet nicht

Wenn MongoDB nicht startet, überprüfen Sie die Logs:

```bash
docker logs beyondfire-mongodb
```

Häufige Probleme:
- Falsche Berechtigungen für die Volumes
- Ungültige Umgebungsvariablen
- Port 27017 ist bereits belegt

### API kann keine Verbindung zu MongoDB herstellen

Überprüfen Sie die MongoDB-Verbindungs-URI in der API-Konfiguration:

```bash
docker logs beyondfire-cloud-api
```

Stellen Sie sicher, dass:
- MongoDB läuft und gesund ist
- Die Authentifizierungsdaten korrekt sind
- Die Netzwerkkonfiguration korrekt ist

## Wartung

### Aktualisieren des Stacks

Um den Stack zu aktualisieren, können Sie entweder:

1. Das `deploy-to-portainer.sh`-Skript erneut ausführen
2. In Portainer zum Stack navigieren und auf "Editor" klicken, dann die Änderungen vornehmen und auf "Update the stack" klicken

### Sichern der MongoDB-Daten

Die MongoDB-Daten werden in einem Docker-Volume gespeichert. Um sie zu sichern:

```bash
docker exec beyondfire-mongodb mongodump --uri="mongodb://<MONGO_ROOT_USERNAME>:<MONGO_ROOT_PASSWORD>@localhost:27017/<MONGO_DATABASE>?authSource=admin" --out=/dump
docker cp beyondfire-mongodb:/dump ./mongodb-backup
```

### Wiederherstellen der MongoDB-Daten

```bash
docker cp ./mongodb-backup beyondfire-mongodb:/dump
docker exec beyondfire-mongodb mongorestore --uri="mongodb://<MONGO_ROOT_USERNAME>:<MONGO_ROOT_PASSWORD>@localhost:27017/<MONGO_DATABASE>?authSource=admin" /dump
```
