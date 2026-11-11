@echo off
setlocal
rem ============================================================
rem  One-click launcher
rem    - Vite dev server        127.0.0.1:3000
rem    - Dev Cockpit panel      127.0.0.1:5199
rem    - Local recognition API  127.0.0.1:8787  (/api/recognize)
rem
rem  Usage: dev.cmd           full stack
rem         dev.cmd /panel    panel only (vite already running)
rem         dev.cmd /window   also open a standalone Edge app window
rem ============================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"

rem --- locate node: NODE_DIR -> PATH -> bundled portable node ---
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"
where node >nul 2>nul
if errorlevel 1 if exist "%USERPROFILE%\Documents\deepseek-harness\tools\node-v26.13.0-win-x64\node.exe" set "PATH=%USERPROFILE%\Documents\deepseek-harness\tools\node-v26.13.0-win-x64;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [x] node.exe not found. Install Node.js or set NODE_DIR.
  pause
  exit /b 1
)

if /i "%~1"=="/panel" (
  echo [1/4] skip dev server and recognition api
) else (
  echo [1/4] starting vite dev server on 127.0.0.1:3000
  start "WalpurgisNightSim dev" cmd /c "node node_modules\vite\bin\vite.js --port=3000 --host=127.0.0.1"

  echo [2/4] starting local recognition api on 127.0.0.1:8787
  start "Recognition API" cmd /c "node scripts\dev-api.mjs"

  ping -n 4 127.0.0.1 >nul
)

echo [3/4] starting dev cockpit on 127.0.0.1:5199
start "Dev Cockpit" cmd /c "node dev-panel\server.mjs"
ping -n 3 127.0.0.1 >nul
echo http://127.0.0.1:5199| clip
echo     panel URL copied to clipboard (paste into DSH right-sidebar Browser)

if /i "%~1"=="/window" (
  echo [4/4] opening standalone panel window
  set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  if not exist "%EDGE%" set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  if exist "%EDGE%" (
    start "" "%EDGE%" --app=http://127.0.0.1:5199 --window-size=1180,1000
  ) else (
    start "" http://127.0.0.1:5199
  )
) else (
  echo [4/4] no separate window - use DSH right-sidebar Browser with the clipboard URL
)

echo.
echo  Done. Keep the console windows open; close them to stop.
ping -n 4 127.0.0.1 >nul
