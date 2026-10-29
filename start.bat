@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call npm install
)
echo Mo trinh duyet tai http://localhost:3000
start "" http://localhost:3000
call npm start
pause
