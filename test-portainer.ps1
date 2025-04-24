# PowerShell-Skript zum Testen der Portainer-Verbindung

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Testing connection to Portainer at $portainerUrl"
Write-Host "Using username: $username"

# Test, ob Portainer erreichbar ist
Write-Host "Testing if Portainer is reachable..."
try {
    $statusResponse = Invoke-RestMethod -Uri "$portainerUrl/api/status" -Method Get -ErrorAction Stop
    Write-Host "✅ Portainer is reachable" -ForegroundColor Green
    Write-Host "Portainer version: $($statusResponse.Version)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Portainer is not reachable at $portainerUrl" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    exit 1
}

# Test der Authentifizierung
Write-Host "Testing authentication..."

# Für Portainer 2.x
$authBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

Write-Host "Auth request body: $authBody"

try {
    $authResponse = Invoke-RestMethod -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody -ContentType "application/json" -ErrorAction Stop

    if ($authResponse.jwt) {
        Write-Host "✅ Authentication successful" -ForegroundColor Green

        # Test des API-Zugriffs mit dem Token
        Write-Host "Testing API access..."
        $token = $authResponse.jwt
        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $endpointsResponse = Invoke-RestMethod -Uri "$portainerUrl/api/endpoints" -Method Get -Headers $headers -ErrorAction Stop

        Write-Host "✅ API access successful. Found $($endpointsResponse.Length) endpoints." -ForegroundColor Green
        Write-Host "All tests passed! Portainer connection is working correctly." -ForegroundColor Green
    } else {
        Write-Host "❌ Authentication response did not contain a JWT token" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error connecting to Portainer:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status: $statusCode $statusDescription" -ForegroundColor Red

        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    } else {
        Write-Host "Error message: $_" -ForegroundColor Red
    }
}
