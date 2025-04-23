# PowerShell-Skript zum Erkunden der Portainer-API

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Exploring Portainer API at $portainerUrl"
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
    
    # Get Portainer stacks
    Write-Host "`n--- Getting Portainer Stacks ---" -ForegroundColor Cyan
    $stacksResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "Found $($stacksResponse.Length) stacks:" -ForegroundColor Green
    foreach ($stack in $stacksResponse) {
        Write-Host "  - Stack ID: $($stack.Id), Name: $($stack.Name), Endpoint ID: $($stack.EndpointId)" -ForegroundColor Green
    }
    
    # Test creating a stack
    Write-Host "`n--- Testing Stack Creation API ---" -ForegroundColor Cyan
    
    # First, try the standard API endpoint
    Write-Host "Testing standard stack creation endpoint..." -ForegroundColor Yellow
    $testStackName = "test-stack-$(Get-Random)"
    $testComposeContent = @"
version: '3'
services:
  nginx:
    image: nginx:latest
    ports:
      - "8080:80"
"@
    
    $createStackBody = @{
        name = $testStackName
        stackFileContent = $testComposeContent
        endpointId = $endpointId
    } | ConvertTo-Json
    
    try {
        $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks" -Method Post -Headers $headers -Body $createStackBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "Stack creation successful using standard endpoint!" -ForegroundColor Green
        Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
        
        # Clean up the test stack
        Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)" -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Test stack deleted." -ForegroundColor Green
    } catch {
        Write-Host "Error creating stack using standard endpoint: $_" -ForegroundColor Red
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
        
        # Try alternative endpoint for Portainer 2.x
        Write-Host "`nTesting alternative stack creation endpoint for Portainer 2.x..." -ForegroundColor Yellow
        $testStackName = "test-stack-$(Get-Random)"
        
        try {
            $createStackBody = @{
                name = $testStackName
                stackFileContent = $testComposeContent
                swarmID = ""
                env = @()
            } | ConvertTo-Json
            
            $createStackResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks?endpointId=$endpointId&method=string&type=1" -Method Post -Headers $headers -Body $createStackBody -ContentType "application/json" -ErrorAction Stop
            Write-Host "Stack creation successful using alternative endpoint!" -ForegroundColor Green
            Write-Host "Stack ID: $($createStackResponse.Id)" -ForegroundColor Green
            
            # Clean up the test stack
            Write-Host "Cleaning up test stack..." -ForegroundColor Yellow
            Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($createStackResponse.Id)?endpointId=$endpointId" -Method Delete -Headers $headers -ErrorAction Stop
            Write-Host "Test stack deleted." -ForegroundColor Green
        } catch {
            Write-Host "Error creating stack using alternative endpoint: $_" -ForegroundColor Red
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
