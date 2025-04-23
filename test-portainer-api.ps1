# PowerShell-Skript zum Testen der Portainer-API

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Testing Portainer API at $portainerUrl"
Write-Host "Using username: $username"
Write-Host "Using password: $password"

# Test Portainer Status
Write-Host "`n--- Testing Portainer Status ---" -ForegroundColor Cyan
try {
    $statusResponse = Invoke-RestMethod -Uri "$portainerUrl/api/status" -Method Get -ErrorAction Stop
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Response: $($statusResponse | ConvertTo-Json -Depth 3)"
    Write-Host "Portainer version: $($statusResponse.Version)" -ForegroundColor Green
} catch {
    Write-Host "Error testing Portainer status: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

# Test Authentication Format 1: Standard JSON (lowercase)
Write-Host "`n--- Testing Authentication Format 1: Standard JSON (lowercase) ---" -ForegroundColor Cyan
$authBody1 = @{
    username = $username
    password = $password
} | ConvertTo-Json

Write-Host "Request Body: $authBody1"

try {
    $authResponse1 = Invoke-RestMethod -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody1 -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Response: $($authResponse1 | ConvertTo-Json -Depth 3)"
    
    # Store the JWT token for later use
    $jwtToken = $authResponse1.jwt
    Write-Host "JWT Token: $jwtToken" -ForegroundColor Green
} catch {
    Write-Host "Error with Format 1: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
}

# Test Authentication Format 2: Camel Case
Write-Host "`n--- Testing Authentication Format 2: Camel Case ---" -ForegroundColor Cyan
$authBody2 = @{
    Username = $username
    Password = $password
} | ConvertTo-Json

Write-Host "Request Body: $authBody2"

try {
    $authResponse2 = Invoke-RestMethod -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody2 -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Response: $($authResponse2 | ConvertTo-Json -Depth 3)"
    
    # Store the JWT token if not already set
    if (-not $jwtToken) {
        $jwtToken = $authResponse2.jwt
        Write-Host "JWT Token: $jwtToken" -ForegroundColor Green
    }
} catch {
    Write-Host "Error with Format 2: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
}

# If we have a JWT token, test endpoints
if ($jwtToken) {
    Write-Host "`n--- Testing Endpoints with Token ---" -ForegroundColor Cyan
    try {
        $headers = @{
            "Authorization" = "Bearer $jwtToken"
        }
        
        $endpointsResponse = Invoke-RestMethod -Uri "$portainerUrl/api/endpoints" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "Status: Success" -ForegroundColor Green
        Write-Host "Response: $($endpointsResponse | ConvertTo-Json -Depth 3)"
    } catch {
        Write-Host "Error testing endpoints with token: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "Status Code: $statusCode" -ForegroundColor Red
            
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response Body: $responseBody" -ForegroundColor Red
            } catch {
                Write-Host "Could not read response body" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "`nNo JWT token available. Skipping endpoint test." -ForegroundColor Yellow
}
