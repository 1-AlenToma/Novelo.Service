@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
TITLE Novelo Service - Auto Installer/Repair

SET SERVICE_NAME=NoveloService
SET SERVICE_SCRIPT=%~dp0service.js

echo ======================================
echo   Novelo Service - Auto Installer
echo ======================================
echo.

REM --- Step 1: Check if service exists in SCM ---
sc query "%SERVICE_NAME%" >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [INFO] Service not registered. Installing...
    START /MIN "" node "%SERVICE_SCRIPT%"
    goto :wait_install
)

REM --- Step 2: Check current service state ---
for /f "tokens=3 delims=: " %%A in ('sc query "%SERVICE_NAME%" ^| findstr /I "STATE"') do set STATE=%%A
set STATE=%STATE: =%
echo [INFO] Current service state: !STATE!

IF /I "!STATE!"=="STOPPED" (
    echo [INFO] Service is installed but stopped. Attempting to start...
    net start "%SERVICE_NAME%" >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Service started successfully.
        goto :end
    ) ELSE (
        echo [WARN] Failed to start service. Attempting reinstall...
        sc delete "%SERVICE_NAME%" >nul 2>&1
        timeout /t 5 /nobreak >nul
        START /MIN "" node "%SERVICE_SCRIPT%"
        goto :wait_install
    )
)

IF /I "!STATE!"=="RUNNING" (
    echo [INFO] Service is already running.
    goto :end
)

REM --- Step 3: Service installed and in unknown state ---
echo [INFO] Service is installed but in unknown state (!STATE!). Please check manually.
goto :end

:wait_install
echo [INFO] Waiting for installation to complete...
timeout /t 10 /nobreak >nul

REM --- Start service after installation ---
echo [INFO] Starting service "%SERVICE_NAME%"...
net start "%SERVICE_NAME%" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Service started successfully.
) ELSE (
    echo [WARN] Service may have failed to start. Check Event Viewer for errors.
    sc query "%SERVICE_NAME%" | findstr /I "STATE"
)

:end
echo.
ENDLOCAL
