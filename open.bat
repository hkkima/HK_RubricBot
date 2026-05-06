@echo off
:: AssignmentBotWeb - open.bat
:: Install deps once, build once, then serve the static dist/ folder.

cd /d "%~dp0"

:: Step 1 - install dependencies if node_modules is missing
if not exist node_modules\ (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo npm install failed. Press any key to exit.
        pause >nul
        exit /b 1
    )
)

:: Step 2 - build if dist is missing
if not exist dist\ (
    echo [2/3] Building static files...
    call npm run build
    if errorlevel 1 (
        echo Build failed. Press any key to exit.
        pause >nul
        exit /b 1
    )
) else (
    echo [OK] dist already exists. Delete dist\ to force a rebuild.
)

:: Step 3 - serve and open browser
echo.
echo  Opening http://localhost:5173
echo  Close this window to stop the server.
echo.

start /b npx vite preview --port 5173
timeout /t 2 /nobreak >nul
start http://localhost:5173

pause >nul
