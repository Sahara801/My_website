@echo off
:: This script opens your To-Do List App in your default web browser
echo ==============================================
echo   Opening your To-Do List App...
echo ==============================================
start "" "%~dp0todo.html"
exit
