@echo off
title Frontend HemoVida - React Vite
echo ========================================================
echo   INICIANDO FRONTEND HEMOVIDA (REACT + VITE)
echo ========================================================
cd frontend
if not exist node_modules (
    echo Instalando paquetes de React con legacy peer deps...
    call npm install --legacy-peer-deps
)
call npm run dev
pause
