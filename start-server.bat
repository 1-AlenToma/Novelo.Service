@echo off
SETLOCAL

REM Path to your server.js
SET SERVER_PATH="%~dp0server.js"


REM Check if Node.js exists
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    pause
    EXIT /B 1
)



REM Check if server is already running
echo Checking if server is running...
tasklist /FI "IMAGENAME eq node.exe" /FO LIST | findstr /I "server.js" >nul
IF %ERRORLEVEL% EQU 0 (
    echo Server is already running.
    pause
    EXIT /B 0
)


REM Start the server
echo Starting server at %SERVER_PATH%
START "Novelo Server" /MIN cmd /c "node %SERVER_PATH%"
echo Server started.
EXIT
