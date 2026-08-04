@echo off
title Streamora - Mon serveur de films
cd /d "%~dp0"
echo ==========================================
echo    Streamora - Mon serveur de films
echo ==========================================
echo.

REM 1) Verifier Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python n'est pas installe.
    echo     Telecharge-le : https://www.python.org/downloads/
    echo     Pendant l'installation, COCHE "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

REM 2) Verifier le client SSH integre a Windows (signe Microsoft, non bloque)
where ssh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Le client OpenSSH de Windows est absent.
    echo     Active-le : Parametres ^> Applications ^> Fonctionnalites facultatives
    echo                 ^> "Ajouter une fonctionnalite" ^> "Client OpenSSH" ^> Installer.
    echo     Puis relance ce fichier.
    echo.
    pause
    exit /b 1
)

REM 3) Lancer le serveur de fichiers dans une autre fenetre
echo [*] Demarrage du serveur de fichiers...
start "Streamora Media Server" cmd /k python streamora_server.py

REM Attendre que le serveur reponde vraiment
echo [*] Attente du demarrage du serveur...
:waitloop
powershell -Command "try{(Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:8090/api/files)|Out-Null;exit 0}catch{exit 1}" >nul 2>nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo [*] Serveur pret !

echo.
echo ==========================================
echo   Ton lien public va s'afficher ci-dessous.
echo   Cherche la ligne :
echo      Forwarding HTTP traffic from https://xxxxx.serveo.net
echo.
echo   1. Copie l'adresse https://xxxxx.serveo.net
echo   2. Sur Streamora : Admin ^> "Video -^> URL" ^> "Adresse de mon serveur"
echo      colle l'adresse ^> Enregistrer.
echo   3. Ouvre cette adresse dans ton navigateur pour voir tes films.
echo.
echo   Garde CETTE fenetre ouverte pendant que tu utilises le site.
echo ==========================================
echo.

:tunnel
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes -R 80:localhost:8090 serveo.net
echo.
echo [!] Le lien s'est coupe (internet ou serveo). Nouvelle tentative dans 5 secondes...
timeout /t 5 /nobreak >nul
goto tunnel
