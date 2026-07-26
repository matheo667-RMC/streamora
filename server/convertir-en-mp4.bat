@echo off
title Streamora - Convertir en MP4 (lisible dans le navigateur)
cd /d "%~dp0"
echo ==========================================
echo   Streamora - Conversion .mkv -^> .mp4
echo ==========================================
echo.
echo  Les navigateurs (Chrome, etc.) ne lisent PAS le .mkv.
echo  Cet outil convertit tes fichiers en .mp4 lisibles partout.
echo  (la video n'est PAS re-encodee : c'est rapide)
echo.

REM 1) Telecharger ffmpeg si absent
if not exist "ffmpeg.exe" (
    echo [*] Telechargement de ffmpeg...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
    if not exist "ffmpeg.zip" (
        echo [!] Echec du telechargement. Verifie ta connexion.
        pause & exit /b 1
    )
    echo [*] Extraction...
    powershell -Command "Expand-Archive -Force 'ffmpeg.zip' 'ffmpeg_tmp'"
    for /r "ffmpeg_tmp" %%F in (ffmpeg.exe) do copy "%%F" "ffmpeg.exe" >nul
    rmdir /s /q "ffmpeg_tmp"
    del "ffmpeg.zip"
    if not exist "ffmpeg.exe" ( echo [!] ffmpeg introuvable apres extraction. & pause & exit /b 1 )
)

echo.
set /p SRC=Dossier ou lecteur a convertir (ex: D:\Streamora ): 
if "%SRC%"=="" ( echo Aucun dossier. & pause & exit /b 1 )

echo.
echo [*] Recherche des fichiers .mkv dans "%SRC%" ...
echo.

for /r "%SRC%" %%F in (*.mkv *.mkv.mp4) do (
    echo -----------------------------------------
    echo Conversion : %%~nxF
    ffmpeg -y -i "%%F" -c:v copy -c:a aac -movflags +faststart "%%~dpnF.web.mp4" -loglevel error -stats
    if exist "%%~dpnF.web.mp4" ( echo   OK -^> %%~nF.web.mp4 ) else ( echo   [!] Echec sur ce fichier )
)

echo.
echo ==========================================
echo  Termine ! Les fichiers ".web.mp4" sont lisibles dans le navigateur.
echo  Relance ensuite serveur-streamora.bat et copie leurs liens.
echo ==========================================
pause
