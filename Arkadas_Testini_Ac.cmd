@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Uc test hesabi ve ayri oyun pencereleri acilacak.
node scripts/friends-demo.mjs
if errorlevel 1 pause
