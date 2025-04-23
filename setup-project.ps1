# PowerShell-Script zum Erstellen der Projektstruktur

# Erstelle Verzeichnisse
New-Item -Path "src" -ItemType Directory -Force
New-Item -Path "tests" -ItemType Directory -Force
New-Item -Path "docs" -ItemType Directory -Force

# Erstelle .gitignore
$gitignoreContent = @"
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.log

# Environment variables
.env
.env.local

# IDE and editor files
.vscode/
.idea/
*.swp
*~

# OS files
.DS_Store
Thumbs.db
"@

Set-Content -Path ".gitignore" -Value $gitignoreContent

# Erstelle Beispieldateien
Set-Content -Path "src\index.js" -Value "// Main application entry point`nconsole.log('Application initialized');"
Set-Content -Path "tests\test.js" -Value "// Test file`nconsole.log('Test runner');"
Set-Content -Path "docs\README.md" -Value "# Project Documentation`n`nThis folder contains project documentation."

Write-Host "Projektstruktur wurde erfolgreich erstellt!" -ForegroundColor Green