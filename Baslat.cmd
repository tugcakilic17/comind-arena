@echo off
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js kurulu olmali. Node.js 22.12 veya ustunu kurun.
  pause
  exit /b 1
)
if not exist node_modules\vite (
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo CoMind Arena: http://127.0.0.1:5174
call npm.cmd run dev
pause
