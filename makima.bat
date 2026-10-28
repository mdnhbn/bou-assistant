@echo off
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
title Makima AI Assistant
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 goto nopython

if not exist ".venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 goto fail
)

call ".venv\Scripts\activate.bat"

if not exist ".installed4" (
    echo Installing packages, please wait...
    python -m pip install --upgrade pip
    pip install requests pillow pyautogui pyttsx3 SpeechRecognition sounddevice edge-tts psutil opencv-python keyring
    if errorlevel 1 goto fail
    echo done> .installed4
)

if not exist "makima.py" (
    echo ERROR: makima.py was not found in this folder.
    goto fail
)
if not exist "makima_gui.py" (
    echo ERROR: makima_gui.py was not found in this folder.
    goto fail
)

python makima_gui.py
if errorlevel 1 goto fail
exit /b 0

:nopython
echo ERROR: Python is not installed or not in PATH.
pause
exit /b 1

:fail
echo.
echo Something failed. Read the messages above.
pause
exit /b 1
