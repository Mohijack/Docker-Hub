param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

# SSH-Verbindungsdaten
$sshHost = "192.168.200.170"
$sshUser = "philipp"
$sshPassword = "qwert123456"

# Befehl, der auf dem Remote-Server ausgeführt werden soll
$fullCommand = "echo '$sshPassword' | sudo -S $Command"

# SSH-Befehl zusammenstellen
$sshCommand = "sshpass -p '$sshPassword' ssh $sshUser@$sshHost '$fullCommand'"

# Befehl in einer Bash-Shell ausführen
$output = bash -c "$sshCommand" 2>&1

# Ausgabe zurückgeben
$output
