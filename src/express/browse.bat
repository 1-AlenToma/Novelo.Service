@echo off
setlocal

REM ---------- check file ----------
if not exist "config.json" (
    echo ERROR: config.json not found
    pause
    exit /b 1
)

REM ---------- get port via PowerShell ----------
for /f "delims=" %%P in ('powershell.exe -NoProfile -Command "Get-Content -Raw 'config.json' | ConvertFrom-Json | Select-Object -ExpandProperty port"') do set PORT=%%P

REM fallback if port is empty
if "%PORT%"=="" (
    echo ERROR: Could not read port from config.json
    pause
    exit /b 1
)

REM ---------- open browser ----------
echo Opening http://localhost:%PORT% ...
start "" "http://localhost:%PORT%"

endlocal
