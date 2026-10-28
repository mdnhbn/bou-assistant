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
".venv\Scripts\python.exe" -B makima_studio.py
if errorlevel 1 pause
