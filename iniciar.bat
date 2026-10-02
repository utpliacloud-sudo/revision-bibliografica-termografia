@echo off
setlocal
cd /d "%~dp0"
title Brujula Web
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 18 o posterior para iniciar el servidor local.
  pause
  exit /b 1
)
echo Abre http://localhost:3000 en tu navegador.
echo Para detener el servidor, pulsa Ctrl+C.
node server.mjs
pause
