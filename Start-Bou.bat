@echo off
setlocal
title Bou - AI Assistant
cd /d "%~dp0"
set PYTHONUTF8=1
set PYTHONDONTWRITEBYTECODE=1
if not exist "bou_core.py" (
  echo Place these update files inside your existing Ai assistent folder.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  where python >nul 2>&1
  if errorlevel 1 goto nopython
  echo Creating Bou's Python environment...
  python -m venv .venv
  if errorlevel 1 goto fail
)
".venv\Scripts\python.exe" -m pip --version >nul 2>&1
if errorlevel 1 (
  ".venv\Scripts\python.exe" -m ensurepip
  if errorlevel 1 goto fail
)
".venv\Scripts\python.exe" -c "import requests,PIL,pyautogui,pyttsx3,speech_recognition,sounddevice,edge_tts,psutil,keyring,numpy,faster_whisper" >nul 2>&1
if errorlevel 1 (
  echo Installing Bou's assistant, live voice, and offline Whisper packages...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto fail
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
".venv\Scripts\python.exe" -B bou_studio.py
if errorlevel 1 pause
exit /b 0

:nopython
echo ERROR: Python is not installed or not in PATH. Install Python 3.11 or newer, then run Start-Bou.bat again.
pause
exit /b 1

:fail
echo.
echo Bou setup failed. Read the messages above.
pause
exit /b 1
