# PowerShell-Skript zum Testen verschiedener Methoden zum Erstellen eines Stacks

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Testing Stack Creation Methods at $portainerUrl"
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
    
    # Test stack creation methods
    $testStackName = "test-stack-$(Get-Random)"
    $testComposeContent = @"
version: '3'
services:
  nginx:
    image: nginx:latest
    ports:
      - "8080:80"
"@
    
    # Method 1: Standard POST to /api/stacks
    Write-Host "`n--- Method 1: Standard POST to /api/stacks ---" -ForegroundColor Cyan
    $createStackBody1 = @{
        name = $testStackName
        stackFileContent = $testComposeContent
        endpointId = $endpointId
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks" -Method Post -Headers $headers -Body $createStackBody1 -ContentType "application/json" -ErrorAction Stop
        Write-Host "Stack creation successful using Method 1!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error with Method 1: $_" -ForegroundColor Red
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
    
    # Method 2: POST to /api/stacks with query parameters
    Write-Host "`n--- Method 2: POST to /api/stacks with query parameters ---" -ForegroundColor Cyan
    $createStackBody2 = @{
        name = $testStackName
        stackFileContent = $testComposeContent
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks?endpointId=$endpointId&method=string&type=2" -Method Post -Headers $headers -Body $createStackBody2 -ContentType "application/json" -ErrorAction Stop
        Write-Host "Stack creation successful using Method 2!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)?endpointId=$endpointId" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error with Method 2: $_" -ForegroundColor Red
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
    
    # Method 3: POST to /api/stacks/create/standalone/file
    Write-Host "`n--- Method 3: POST to /api/stacks/create/standalone/file ---" -ForegroundColor Cyan
    $createStackBody3 = @{
        name = $testStackName
        stackFileContent = $testComposeContent
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks/create/standalone/file?endpointId=$endpointId" -Method Post -Headers $headers -Body $createStackBody3 -ContentType "application/json" -ErrorAction Stop
        Write-Host "Stack creation successful using Method 3!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)?endpointId=$endpointId" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error with Method 3: $_" -ForegroundColor Red
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
    
    # Method 4: POST to /api/stacks/create/standalone/string
    Write-Host "`n--- Method 4: POST to /api/stacks/create/standalone/string ---" -ForegroundColor Cyan
    $createStackBody4 = @{
        name = $testStackName
        stackFileContent = $testComposeContent
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks/create/standalone/string?endpointId=$endpointId" -Method Post -Headers $headers -Body $createStackBody4 -ContentType "application/json" -ErrorAction Stop
        Write-Host "Stack creation successful using Method 4!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)?endpointId=$endpointId" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error with Method 4: $_" -ForegroundColor Red
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
