@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang chay tai: %CD%
echo Dang chay tool khong can Python...
powershell -ExecutionPolicy Bypass -File "%~dp0CHAY-KHONG-CAN-PYTHON-FIX.ps1"
pause
