# PowerShell-Skript zum Testen verschiedener Formate für die Portainer-Authentifizierung

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
    $statusResponse = Invoke-WebRequest -Uri "$portainerUrl/api/status" -Method Get -ErrorAction Stop
    Write-Host "Status code: $($statusResponse.StatusCode)"
    Write-Host "Response: $($statusResponse.Content)"
    Write-Host "✅ Portainer is reachable" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Portainer is not reachable at $portainerUrl" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    exit 1
}

# Format 1: Standard JSON
Write-Host "`nTesting Format 1: Standard JSON"
$authBody1 = @{
    username = $username
    password = $password
} | ConvertTo-Json
Write-Host "Auth request body: $authBody1"

try {
    $authResponse = Invoke-WebRequest -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody1 -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status code: $($authResponse.StatusCode)"
    Write-Host "Response: $($authResponse.Content)"
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error connecting to Portainer:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status: $statusCode $statusDescription" -ForegroundColor Red
    } else {
        Write-Host "Error message: $_" -ForegroundColor Red
    }
}

# Format 2: Camel Case
Write-Host "`nTesting Format 2: Camel Case"
$authBody2 = @{
    Username = $username
    Password = $password
} | ConvertTo-Json
Write-Host "Auth request body: $authBody2"

try {
    $authResponse = Invoke-WebRequest -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody2 -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status code: $($authResponse.StatusCode)"
    Write-Host "Response: $($authResponse.Content)"
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error connecting to Portainer:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status: $statusCode $statusDescription" -ForegroundColor Red
    } else {
        Write-Host "Error message: $_" -ForegroundColor Red
    }
}

# Format 3: Form Data
Write-Host "`nTesting Format 3: Form Data"
$formData = @{
    username = $username
    password = $password
}
Write-Host "Form data: $formData"

try {
    $authResponse = Invoke-WebRequest -Uri "$portainerUrl/api/auth" -Method Post -Body $formData -ContentType "application/x-www-form-urlencoded" -ErrorAction Stop
    Write-Host "Status code: $($authResponse.StatusCode)"
    Write-Host "Response: $($authResponse.Content)"
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error connecting to Portainer:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status: $statusCode $statusDescription" -ForegroundColor Red
    } else {
        Write-Host "Error message: $_" -ForegroundColor Red
    }
}

# Format 4: Different Endpoint
Write-Host "`nTesting Format 4: Different Endpoint"
try {
    $authResponse = Invoke-WebRequest -Uri "$portainerUrl/api/users/login" -Method Post -Body $authBody1 -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status code: $($authResponse.StatusCode)"
    Write-Host "Response: $($authResponse.Content)"
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error connecting to Portainer:" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "Status: $statusCode $statusDescription" -ForegroundColor Red
    } else {
        Write-Host "Error message: $_" -ForegroundColor Red
    }
}
