# Prüfe, ob die erwarteten Verzeichnisse existieren
$directories = @("src", "tests", "docs")
$files = @(".gitignore", "src\index.js", "tests\test.js", "docs\README.md")

$allExist = $true

Write-Host "Prüfe Verzeichnisse..." -ForegroundColor Cyan
foreach ($dir in $directories) {
    if (Test-Path -Path $dir -PathType Container) {
        Write-Host "✓ $dir existiert" -ForegroundColor Green
    } else {
        Write-Host "✗ $dir fehlt" -ForegroundColor Red
        $allExist = $false
    }
}

Write-Host "`nPrüfe Dateien..." -ForegroundColor Cyan
foreach ($file in $files) {
    if (Test-Path -Path $file -PathType Leaf) {
        Write-Host "✓ $file existiert" -ForegroundColor Green
    } else {
        Write-Host "✗ $file fehlt" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    Write-Host "`nAlle erwarteten Dateien und Verzeichnisse sind vorhanden." -ForegroundColor Green
} else {
    Write-Host "`nEs fehlen einige Dateien oder Verzeichnisse." -ForegroundColor Red
}