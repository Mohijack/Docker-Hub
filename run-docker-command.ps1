# Befehl, der ausgeführt werden soll (standardmäßig "docker ps")
param(
    [string]$Command = "docker ps"
)

# SSH-Verbindungsdaten
$sshHost = "192.168.200.170"
$sshUser = "philipp"
$sshPassword = "qwert123456"

# Ausgabe des Befehls
Write-Host "Führe Befehl aus: $Command"
Write-Host "Verbinde mit $sshUser@$sshHost..."
Write-Host "Dies ist ein simulierter Befehl. In einer echten Umgebung würde der Befehl auf dem Remote-Server ausgeführt werden."

# Simulierte Ausgabe des Docker-Befehls
if ($Command -eq "docker ps") {
    Write-Host @"
CONTAINER ID   IMAGE                           COMMAND                  CREATED       STATUS       PORTS                                                                                  NAMES
abc123def456   beyondfire-cloud-frontend:latest   "nginx -g 'daemon of…"   2 hours ago   Up 2 hours   0.0.0.0:80->80/tcp                                                                     beyondfire-cloud-frontend
def456ghi789   beyondfire-cloud-api:latest        "docker-entrypoint.s…"   2 hours ago   Up 2 hours   0.0.0.0:3000->3000/tcp                                                                 beyondfire-cloud-api
ghi789jkl012   mongo:5.0                       "docker-entrypoint.s…"   2 hours ago   Up 2 hours   0.0.0.0:27017->27017/tcp                                                               beyondfire-mongodb
"@
} elseif ($Command -eq "docker logs beyondfire-cloud-api") {
    Write-Host @"
2025-04-24 19:15:05 info: GET /api/health - IP: 192.168.120.97
2025-04-24 19:15:07 info: POST /api/auth/login - IP: 192.168.120.97
2025-04-24 19:15:07 warn: API route not found: POST /api/auth/login
2025-04-24 19:15:10 info: GET /api/test - IP: 192.168.120.97
2025-04-24 19:15:10 warn: API route not found: GET /api/test
2025-04-24 19:15:12 info: GET /api/auth/test - IP: 192.168.120.97
2025-04-24 19:15:12 warn: API route not found: GET /api/auth/test
2025-04-24 19:15:14 info: POST /login-test/login - IP: 192.168.120.97
2025-04-24 19:15:14 info: Login test route accessed
2025-04-24 19:15:14 info: Login successful
"@
} elseif ($Command -eq "docker-compose down") {
    Write-Host @"
Stopping beyondfire-cloud-frontend ... done
Stopping beyondfire-cloud-api      ... done
Stopping beyondfire-mongodb        ... done
Removing beyondfire-cloud-frontend ... done
Removing beyondfire-cloud-api      ... done
Removing beyondfire-mongodb        ... done
Removing network beyondfire-network
"@
} elseif ($Command -eq "docker-compose up -d") {
    Write-Host @"
Creating network "beyondfire-network" with driver "bridge"
Creating beyondfire-mongodb        ... done
Creating beyondfire-cloud-api      ... done
Creating beyondfire-cloud-frontend ... done
"@
} else {
    Write-Host "Simulierte Ausgabe für Befehl: $Command"
    Write-Host "Befehl erfolgreich ausgeführt."
}
