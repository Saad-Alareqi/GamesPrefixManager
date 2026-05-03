@echo off
set OUT_DIR=output\games-prefix-manager
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"

echo Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    exit /b %errorlevel%
)

echo Copying files to %OUT_DIR%...
if not exist "%OUT_DIR%\dist" mkdir "%OUT_DIR%\dist"
copy dist\index.js "%OUT_DIR%\dist\index.js"
copy main.py "%OUT_DIR%\main.py"
copy plugin.json "%OUT_DIR%\plugin.json"
copy package.json "%OUT_DIR%\package.json"
copy README.md "%OUT_DIR%\README.md"
if exist assets xcopy assets "%OUT_DIR%\assets" /I /E /Y

echo.
echo ========================================================
echo BUILD COMPLETE!
echo All files are ready in: %OUT_DIR%
echo Copy the 'games-prefix-manager' folder to your Steam Deck.
echo ========================================================
pause
