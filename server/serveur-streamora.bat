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

REM 2) Telecharger cloudflared si absent (pour le lien public gratuit)
if not exist "cloudflared.exe" (
    echo [*] Telechargement de l'outil de lien public ^(cloudflared^)...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    if not exist "cloudflared.exe" (
        echo [!] Echec du telechargement. Verifie ta connexion internet.
        pause
        exit /b 1
    )
)

REM 3) Lancer le serveur de fichiers dans une autre fenetre
echo [*] Demarrage du serveur de fichiers...
start "Streamora Media Server" cmd /k python streamora_server.py

REM Laisser le temps au serveur de demarrer
timeout /t 3 /nobreak >nul

echo.
echo ==========================================
echo   Ton lien public va s'afficher ci-dessous
echo   (ex: https://xxxx-xxxx.trycloudflare.com)
echo.
echo   1. Ouvre ce lien dans ton navigateur
echo   2. Tu verras la liste de tes films
echo   3. Clique "Copier le lien" et colle-le sur Streamora
echo.
echo   Garde CETTE fenetre ouverte pendant que tu regardes.
echo   Ctrl+C pour tout arreter.
echo ==========================================
echo.

cloudflared.exe tunnel --url http://localhost:8090
