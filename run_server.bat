@echo off
echo ==============================================
echo   Starting Local Web Server on Port 8000...
echo   App URL: http://localhost:8000/index.html
echo   (Press Ctrl + C in this window to stop server)
echo ==============================================
start "" "http://localhost:8000/index.html"
python -m http.server 8000
pause
