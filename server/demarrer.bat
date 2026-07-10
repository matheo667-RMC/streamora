@echo off
title Streamora IPTV Agent
echo ==========================================
echo   Streamora IPTV Agent
echo ==========================================
echo.
echo Au 1er lancement, colle ton lien IPTV quand on te le demande.
echo Ensuite, garde cette fenetre OUVERTE pendant que tu regardes.
echo.
python streamora_iptv_agent.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python n'est pas installe ou introuvable.
    echo 1. Telecharge Python : https://www.python.org/downloads/
    echo 2. Pendant l'installation, COCHE "Add Python to PATH".
    echo 3. Relance ce fichier.
    echo.
    pause
)
