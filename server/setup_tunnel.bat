@echo off
echo ==========================================
echo   Streamora - Tunnel Cloudflare (gratuit)
echo ==========================================
echo.
echo Ce script rend ton serveur accessible partout dans le monde.
echo Pas besoin de compte Cloudflare, c'est gratuit !
echo.

REM Check if cloudflared is installed
where cloudflared >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo cloudflared n'est pas installe.
    echo.
    echo Telecharge-le ici :
    echo   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo.
    echo Renomme le fichier en "cloudflared.exe" et mets-le dans ce dossier.
    echo Puis relance ce script.
    echo.
    pause
    exit /b 1
)

echo Lancement du tunnel...
echo Tu vas recevoir une URL publique (ex: https://xxxx.trycloudflare.com)
echo Copie cette URL et utilise-la dans le panneau admin de Streamora !
echo.
echo Exemple: si ton URL est https://abc-xyz.trycloudflare.com
echo   et ton film est dans Films/Inception.mp4
echo   alors l'URL video sera: https://abc-xyz.trycloudflare.com/Films/Inception.mp4
echo.
echo Appuie sur Ctrl+C pour arreter le tunnel.
echo.

cloudflared tunnel --url http://localhost:8090
