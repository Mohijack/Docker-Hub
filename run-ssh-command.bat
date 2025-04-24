@echo off
setlocal EnableDelayedExpansion

REM SSH-Verbindungsdaten
set SSH_HOST=192.168.200.170
set SSH_USER=philipp
set SSH_PASSWORD=qwert123456

REM Befehl, der ausgeführt werden soll (alle Parameter zusammenfügen)
set COMMAND=%*
if "!COMMAND!"=="" set COMMAND=docker ps

REM Ausgabe des Befehls
echo Führe Befehl aus: !COMMAND!
echo Verbinde mit %SSH_USER%@%SSH_HOST%...

REM SSH-Befehl ausführen
echo %SSH_USER%@%SSH_HOST% Passwort: %SSH_PASSWORD%
echo Führe aus: sudo !COMMAND!

REM Befehl über SSH ausführen
ssh %SSH_USER%@%SSH_HOST% "echo %SSH_PASSWORD% | sudo -S !COMMAND!"

endlocal
