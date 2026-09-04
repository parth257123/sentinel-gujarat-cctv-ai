@echo off
title Gujarat Police 30-Camera Live Harvester
echo ======================================================================
echo    Gujarat Police 30-Camera Live RTSP Harvester (Windows)
echo ======================================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please download and install Python from https://www.python.org/
    echo Make sure to check "Add python.exe to PATH" during installation.
    pause
    exit /b
)

:: Install lightweight requirements
echo [1/2] Checking dependencies (opencv-python, numpy)...
pip install --quiet opencv-python numpy

:: Run harvester
echo [2/2] Starting 24/7 Camera Harvester...
echo Press Ctrl+C at any time to pause or stop.
echo.
python backend1\harvest_live_cameras.py

pause
