@echo off
setlocal
title Wiki Sync
cd /d "%~dp0"

rem find node: NODE_DIR -> PATH -> bundled portable node
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"
where node >nul 2>nul
if errorlevel 1 if exist "%USERPROFILE%\Documents\deepseek-harness\tools\node-v26.13.0-win-x64\node.exe" set "PATH=%USERPROFILE%\Documents\deepseek-harness\tools\node-v26.13.0-win-x64;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [x] node.exe not found
  pause
  exit /b 1
)

echo ============================================
echo   Wiki Sync
echo   1. A browser window will open; let it pass the check
echo   2. New identities are appended automatically
echo ============================================
echo.

node scripts\wiki-sync.mjs
set "CODE=%ERRORLEVEL%"

echo.
if "%CODE%"=="0" (
  echo [OK] Done. You can close this window.
) else (
  echo [x] Failed. See messages above.
)
echo.
pause
