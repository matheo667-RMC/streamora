@echo off
echo ==========================================
echo   Streamora Media Server
echo ==========================================
echo.
python streamora_server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python n'est pas installe ou introuvable.
    echo Telecharge Python sur : https://www.python.org/downloads/
    echo Coche "Add Python to PATH" pendant l'installation !
    echo.
    pause
)
