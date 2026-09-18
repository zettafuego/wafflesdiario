@echo off
cd /d "%~dp0"
echo.
echo  Waffle Daily
echo  ------------
echo  Paz mental · una a la vez · eres un crack
echo  http://127.0.0.1:8768
echo  Ctrl+C para detener
echo.
start http://127.0.0.1:8768
python -m http.server 8768 --bind 127.0.0.1
if errorlevel 1 (
  npx --yes serve -l 8768
)
