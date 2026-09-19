@echo off
start "server" cmd /k "cd /d %~dp0server && npm run dev"
start "web" cmd /k "cd /d %~dp0 && npm run dev"
