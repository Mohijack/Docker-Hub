param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

# SSH-Verbindungsdaten
$sshHost = "192.168.200.170"
$sshUser = "philipp"
$sshPassword = "qwert123456"

# Temporäre Datei für die Ausgabe
$outputFile = [System.IO.Path]::GetTempFileName()

Write-Host "Führe Befehl aus: $Command"
Write-Host "Verbinde mit $sshUser@$sshHost..."

# Verwenden von Start-Process, um interaktiv mit dem SSH-Prozess zu interagieren
$sshProcess = Start-Process -FilePath "ssh" -ArgumentList "$sshUser@$sshHost" -NoNewWindow -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError "$outputFile.err"

# Warten, bis der Prozess gestartet ist
Start-Sleep -Seconds 2

# Passwort eingeben
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("$sshPassword{ENTER}")

# Warten, bis die Anmeldung abgeschlossen ist
Start-Sleep -Seconds 2

# Befehl eingeben
[System.Windows.Forms.SendKeys]::SendWait("sudo $Command{ENTER}")

# Warten auf Passwortabfrage
Start-Sleep -Seconds 2

# Passwort erneut eingeben
[System.Windows.Forms.SendKeys]::SendWait("$sshPassword{ENTER}")

# Warten, bis der Befehl abgeschlossen ist
Start-Sleep -Seconds 5

# Beenden der SSH-Sitzung
[System.Windows.Forms.SendKeys]::SendWait("exit{ENTER}")

# Warten, bis der Prozess beendet ist
$sshProcess.WaitForExit()

# Ausgabe lesen und zurückgeben
$output = Get-Content -Path $outputFile -Raw
$errorOutput = Get-Content -Path "$outputFile.err" -Raw -ErrorAction SilentlyContinue

# Temporäre Dateien löschen
Remove-Item -Path $outputFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$outputFile.err" -Force -ErrorAction SilentlyContinue

# Ausgabe zurückgeben
Write-Host "Ausgabe des Befehls:"
$output
if ($errorOutput) {
    Write-Host "Fehlerausgabe:"
    $errorOutput
}
