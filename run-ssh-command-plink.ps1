param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

# SSH-Verbindungsdaten
$sshHost = "192.168.200.170"
$sshUser = "philipp"
$sshPassword = "qwert123456"

# Erstellen eines temporären Skripts für die Ausführung auf dem Remote-Server
$remoteScript = @"
echo '$sshPassword' | sudo -S $Command
"@

# Temporäre Datei für das Skript
$tempScriptFile = [System.IO.Path]::GetTempFileName()
$remoteScript | Out-File -FilePath $tempScriptFile -Encoding ASCII

try {
    # Verwenden von plink (Teil von PuTTY) für die SSH-Verbindung
    # Stellen Sie sicher, dass plink.exe im PATH ist oder geben Sie den vollständigen Pfad an
    $output = echo $sshPassword | plink -ssh "$sshUser@$sshHost" -pw "$sshPassword" -m "$tempScriptFile" 2>&1
    
    # Ausgabe zurückgeben
    $output
}
catch {
    Write-Error "Fehler beim Ausführen des SSH-Befehls: $_"
}
finally {
    # Temporäre Datei löschen
    Remove-Item -Path $tempScriptFile -Force -ErrorAction SilentlyContinue
}
