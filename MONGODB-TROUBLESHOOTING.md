# MongoDB-Fehlerbehebung für BeyondFire Cloud

Dieses Dokument enthält Anweisungen zur Fehlerbehebung für häufige MongoDB-Probleme im Docker-Stack.

## AVX-Unterstützungsproblem

**Problem**: MongoDB 5.0+ erfordert einen Prozessor mit AVX-Unterstützung. Wenn Ihr Server einen älteren Prozessor hat, sehen Sie möglicherweise diesen Fehler:

```
WARNING: MongoDB 5.0+ requires a CPU with AVX support, and your current system does not appear to have that!
```

**Lösung**: Verwenden Sie MongoDB 4.4, die keine AVX-Unterstützung benötigt. Die docker-compose.yml wurde bereits aktualisiert, um MongoDB 4.4 zu verwenden.

## Häufige Probleme und Lösungen

### Problem 1: MongoDB startet nicht oder wird als "unhealthy" markiert

**Mögliche Ursachen:**
- Der Health-Check schlägt fehl
- Probleme mit der Authentifizierung
- Probleme mit den Volumes oder Berechtigungen

**Lösungen:**

1. **Verwenden Sie die vereinfachte Stack-Datei ohne Health-Check:**
   ```bash
   docker-compose -f docker-compose-simple.yml up -d
   ```
   Diese Version verwendet keinen Health-Check und wartet stattdessen eine feste Zeit (30 Sekunden).

2. **Überprüfen Sie die Logs:**
   ```bash
   docker logs beyondfire-mongodb
   ```
   Suchen Sie nach Fehlern im Zusammenhang mit Authentifizierung oder Berechtigungen.

3. **Löschen Sie die Volumes und starten Sie neu:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```
   Manchmal können beschädigte Daten in den Volumes Probleme verursachen.

4. **Überprüfen Sie die MongoDB-Version:**
   Die Stack-Datei verwendet MongoDB 6.0. Wenn Ihr System eine ältere Version benötigt, ändern Sie `image: mongo:6.0` zu `image: mongo:5.0` oder `image: mongo:4.4`.

### Problem 2: MongoDB-Initialisierung schlägt fehl

**Mögliche Ursachen:**
- MongoDB ist noch nicht bereit, wenn der Init-Container startet
- Probleme mit der Authentifizierung
- Fehler im Initialisierungsskript

**Lösungen:**

1. **Erhöhen Sie die Wartezeit:**
   - Ändern Sie im Init-Container `sleep 30` zu `sleep 60` oder höher
   - Dies gibt MongoDB mehr Zeit zum Starten

2. **Überprüfen Sie die Logs des Init-Containers:**
   - Öffnen Sie in Portainer den Container `beyondfire-mongodb-init`
   - Klicken Sie auf "Logs", um die Fehlermeldungen zu sehen

3. **Führen Sie die Initialisierung manuell durch:**
   - Wenn der automatische Prozess fehlschlägt, können Sie die Initialisierung manuell durchführen
   - Öffnen Sie eine Shell im MongoDB-Container:
     ```bash
     docker exec -it beyondfire-mongodb mongosh -u admin -p BeyondFireAdmin2023! --authenticationDatabase admin
     ```
   - Führen Sie die Befehle aus dem Initialisierungsskript manuell aus

### Problem 3: API kann keine Verbindung zu MongoDB herstellen

**Mögliche Ursachen:**
- MongoDB ist nicht erreichbar
- Falsche Verbindungs-URI
- Authentifizierungsprobleme

**Lösungen:**

1. **Überprüfen Sie die Verbindungs-URI:**
   - Stellen Sie sicher, dass die URI in der API-Konfiguration korrekt ist:
     ```
     MONGO_URI=mongodb://admin:BeyondFireAdmin2023!@beyondfire-mongodb:27017/beyondfire_cloud?authSource=admin
     ```

2. **Testen Sie die Verbindung manuell:**
   - Öffnen Sie eine Shell im API-Container:
     ```bash
     docker exec -it beyondfire-cloud-api sh
     ```
   - Installieren Sie MongoDB-Tools:
     ```bash
     apk add --no-cache mongodb-tools
     ```
   - Testen Sie die Verbindung:
     ```bash
     mongosh mongodb://admin:BeyondFireAdmin2023!@beyondfire-mongodb:27017/beyondfire_cloud?authSource=admin
     ```

3. **Überprüfen Sie die Netzwerkkonfiguration:**
   - Stellen Sie sicher, dass beide Container im selben Netzwerk sind
   - Überprüfen Sie, ob der MongoDB-Container unter dem Namen `beyondfire-mongodb` erreichbar ist

## Alternative Lösungen

Wenn die obigen Lösungen nicht funktionieren, können Sie folgende Alternativen in Betracht ziehen:

### Alternative 1: Verwenden Sie eine externe MongoDB-Instanz

Wenn Sie bereits eine MongoDB-Instanz haben oder eine externe Instanz verwenden möchten:

1. Aktualisieren Sie die `MONGO_URI` in der API-Konfiguration, um auf Ihre externe MongoDB zu verweisen
2. Entfernen Sie die MongoDB-Container aus dem Stack

### Alternative 2: Verwenden Sie MongoDB ohne Authentifizierung (nur für Entwicklung)

Für Entwicklungszwecke können Sie MongoDB ohne Authentifizierung verwenden:

1. Ändern Sie die MongoDB-Konfiguration:
   ```yaml
   beyondfire-mongodb:
     image: mongo:6.0
     container_name: beyondfire-mongodb
     restart: unless-stopped
     ports:
       - "27017:27017"
     volumes:
       - mongodb-data:/data/db
     command: ["--bind_ip_all"]
     networks:
       - beyondfire-network
   ```

2. Aktualisieren Sie die `MONGO_URI` in der API-Konfiguration:
   ```
   MONGO_URI=mongodb://beyondfire-mongodb:27017/beyondfire_cloud
   ```

**Hinweis:** Diese Option ist nur für Entwicklungszwecke geeignet und sollte nicht in Produktionsumgebungen verwendet werden.

## Kontakt und Support

Wenn Sie weitere Hilfe benötigen, wenden Sie sich an den Support oder erstellen Sie ein Issue im GitHub-Repository.
