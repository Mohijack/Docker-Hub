# PowerShell-Skript zum Testen der aktualisierten Docker-Compose-Datei

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Testing Updated Stack Creation at $portainerUrl"
Write-Host "Using username: $username"

# Authenticate with Portainer
Write-Host "`n--- Authenticating with Portainer ---" -ForegroundColor Cyan
$authBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$portainerUrl/api/auth" -Method Post -Body $authBody -ContentType "application/json" -ErrorAction Stop
    $token = $authResponse.jwt
    Write-Host "Authentication successful. JWT token received." -ForegroundColor Green
    
    # Set headers for subsequent requests
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Get Portainer endpoints
    Write-Host "`n--- Getting Portainer Endpoints ---" -ForegroundColor Cyan
    $endpointsResponse = Invoke-RestMethod -Uri "$portainerUrl/api/endpoints" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "Found $($endpointsResponse.Length) endpoints:" -ForegroundColor Green
    foreach ($endpoint in $endpointsResponse) {
        Write-Host "  - Endpoint ID: $($endpoint.Id), Name: $($endpoint.Name), Type: $($endpoint.Type)" -ForegroundColor Green
    }
    
    # Get endpoint ID for local Docker environment
    $localEndpoint = $endpointsResponse | Where-Object { $_.Name -eq "local" } | Select-Object -First 1
    if ($localEndpoint) {
        $endpointId = $localEndpoint.Id
        Write-Host "Using local endpoint with ID: $endpointId" -ForegroundColor Green
    } else {
        $endpointId = $endpointsResponse[0].Id
        Write-Host "No local endpoint found. Using first endpoint with ID: $endpointId" -ForegroundColor Yellow
    }
    
    # Test with the updated FE2 docker-compose file
    Write-Host "`n--- Testing Updated FE2 Stack Creation ---" -ForegroundColor Cyan
    $testStackName = "test-updated-fe2-stack-$(Get-Random)"
    $uniqueId = "test123"
    $domain = "test.beyondfire.cloud"
    $port = "12345"
    
    $updatedFe2ComposeContent = @"
version: "3.7"

services:
  fe2_database:
    image: mongo:4.4.29
    container_name: fe2_database_$uniqueId
    logging:
      driver: none
    ports:
      - 27017
    restart: unless-stopped

  fe2_app:
    image: nginx:alpine
    container_name: fe2_app_$uniqueId
    hostname: fe2-$domain
    environment:
      - FE2_EMAIL=admin@beyondfire.cloud
      - FE2_PASSWORD=BeyondFire2024!
      - FE2_ACTIVATION_NAME=fe2_$uniqueId
      - FE2_IP_MONGODB=fe2_database_$uniqueId
      - FE2_PORT_MONGODB=27017
    ports:
      - "$port:80"
    restart: unless-stopped
    depends_on:
      - fe2_database

  fe2_nginx:
    image: nginx:alpine
    container_name: fe2_nginx_$uniqueId
    ports:
      - "8080:80"
    restart: unless-stopped
    depends_on:
      - fe2_app
"@
    
    $createStackBody = @{
        name = $testStackName
        stackFileContent = $updatedFe2ComposeContent
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks/create/standalone/string?endpointId=$endpointId" -Method Post -Headers $headers -Body $createStackBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "Updated FE2 stack creation successful!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)?endpointId=$endpointId" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error creating updated FE2 stack: $_" -ForegroundColor Red
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
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
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
