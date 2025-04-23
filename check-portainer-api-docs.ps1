# PowerShell-Skript zum Überprüfen der Portainer-API-Dokumentation

# Umgebungsvariablen aus .env-Datei laden
$envContent = Get-Content .env
$portainerUrl = ($envContent | Where-Object { $_ -match "PORTAINER_URL=(.*)" } | ForEach-Object { $matches[1] })
$username = ($envContent | Where-Object { $_ -match "PORTAINER_USERNAME=(.*)" } | ForEach-Object { $matches[1] })
$password = ($envContent | Where-Object { $_ -match "PORTAINER_PASSWORD=(.*)" } | ForEach-Object { $matches[1] })

Write-Host "Checking Portainer API Documentation at $portainerUrl"
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
    
    # Check if Swagger documentation is available
    Write-Host "`n--- Checking for Swagger Documentation ---" -ForegroundColor Cyan
    try {
        $swaggerResponse = Invoke-WebRequest -Uri "$portainerUrl/api/swagger.json" -Method Get -Headers $headers -ErrorAction Stop
        Write-Host "Swagger documentation is available!" -ForegroundColor Green
        
        # Save Swagger documentation to file
        $swaggerContent = $swaggerResponse.Content
        Set-Content -Path "portainer-swagger.json" -Value $swaggerContent
        Write-Host "Swagger documentation saved to portainer-swagger.json" -ForegroundColor Green
        
        # Parse Swagger documentation to find stack creation endpoints
        $swagger = $swaggerContent | ConvertFrom-Json
        Write-Host "`n--- Stack Creation Endpoints ---" -ForegroundColor Cyan
        
        foreach ($path in $swagger.paths.PSObject.Properties) {
            $pathName = $path.Name
            $pathObj = $path.Value
            
            if ($pathName -like "*stack*" -and ($pathObj.post -or $pathObj.put)) {
                Write-Host "Path: $pathName" -ForegroundColor Green
                
                if ($pathObj.post) {
                    Write-Host "  Method: POST" -ForegroundColor Green
                    Write-Host "  Summary: $($pathObj.post.summary)" -ForegroundColor Green
                    Write-Host "  Parameters:" -ForegroundColor Green
                    foreach ($param in $pathObj.post.parameters) {
                        Write-Host "    - $($param.name): $($param.description)" -ForegroundColor Green
                    }
                }
                
                if ($pathObj.put) {
                    Write-Host "  Method: PUT" -ForegroundColor Green
                    Write-Host "  Summary: $($pathObj.put.summary)" -ForegroundColor Green
                    Write-Host "  Parameters:" -ForegroundColor Green
                    foreach ($param in $pathObj.put.parameters) {
                        Write-Host "    - $($param.name): $($param.description)" -ForegroundColor Green
                    }
                }
                
                Write-Host ""
            }
        }
    } catch {
        Write-Host "Swagger documentation is not available: $_" -ForegroundColor Red
        
        # Try to explore API endpoints manually
        Write-Host "`n--- Exploring API Endpoints Manually ---" -ForegroundColor Cyan
        
        # Check if we can get information about stacks
        try {
            $stacksResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks" -Method Get -Headers $headers -ErrorAction Stop
            Write-Host "Found $($stacksResponse.Length) stacks" -ForegroundColor Green
            
            # Check the first stack to understand its structure
            if ($stacksResponse.Length -gt 0) {
                $firstStack = $stacksResponse[0]
                Write-Host "First stack structure:" -ForegroundColor Green
                Write-Host ($firstStack | ConvertTo-Json -Depth 3) -ForegroundColor Green
                
                # Try to get detailed information about the first stack
                try {
                    $stackDetailResponse = Invoke-RestMethod -Uri "$portainerUrl/api/stacks/$($firstStack.Id)" -Method Get -Headers $headers -ErrorAction Stop
                    Write-Host "`nStack detail structure:" -ForegroundColor Green
                    Write-Host ($stackDetailResponse | ConvertTo-Json -Depth 3) -ForegroundColor Green
                } catch {
                    Write-Host "Could not get stack details: $_" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Could not get stacks: $_" -ForegroundColor Red
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
