@echo off
REM Docs Capture - start the web dev server.
REM Double-click this file, or run `dev.cmd` from the project root.
cd /d "%~dp0web"
call npm run dev
