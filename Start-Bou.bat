@echo off
setlocal
title Bou - AI Assistant
cd /d "%~dp0"
set PYTHONUTF8=1
set PYTHONDONTWRITEBYTECODE=1
if not exist "makima.py" (
  echo Place these update files inside your existing Ai assistent folder.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo First run your original makima.bat to set up its Python environment.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -c "import cv2" >nul 2>&1
if errorlevel 1 (
  echo Installing the optional one-frame camera package...
  ".venv\Scripts\python.exe" -m pip install opencv-python
  if errorlevel 1 (
    echo Camera support could not be installed. Chat and the other Bou pages can still run.
  )
)
".venv\Scripts\python.exe" -c "import keyring" >nul 2>&1
if errorlevel 1 (
  echo Installing secure Windows API-key storage...
  ".venv\Scripts\python.exe" -m pip install keyring
  if errorlevel 1 echo Secure key storage is unavailable; keys can still be used for this session.
)
".venv\Scripts\python.exe" -B makima_studio.py
if errorlevel 1 pause
