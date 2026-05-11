@echo off
setlocal

echo.
echo ========================================
echo   Alumco ONG - Entorno Local
echo ========================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
	echo Docker no esta instalado o no esta en PATH.
	echo Instala Docker Desktop y vuelve a ejecutar este script.
	exit /b 1
)

docker compose version >nul 2>nul
if errorlevel 1 (
	echo Docker Compose no esta disponible.
	echo Verifica que Docker Desktop este corriendo.
	exit /b 1
)

:menu
echo.
echo Selecciona una accion:
echo 1) Iniciar (construir e iniciar contenedores)
echo 2) Reiniciar (reiniciar contenedores rapido)
echo 3) Detener (detener contenedores)
echo 4) Limpiar TODO (detener y borrar base de datos)
echo 5) Salir
echo.
set /p opcion="Ingresa el numero de la opcion (1-5): "

if "%opcion%"=="1" goto iniciar
if "%opcion%"=="2" goto reiniciar
if "%opcion%"=="3" goto detener
if "%opcion%"=="4" goto limpiar
if "%opcion%"=="5" goto salir
echo Opcion invalida. Intenta de nuevo.
goto menu

:iniciar
echo.
echo Iniciando entorno local de Alumco con Docker...
echo.
docker compose up --build
if errorlevel 1 (
	echo No se pudo iniciar el stack.
	exit /b 1
)
goto fin

:reiniciar
echo.
echo Reiniciando contenedores...
echo.
docker compose restart
echo.
echo Contenedores reiniciados correctamente.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
pause
goto menu

:detener
echo.
echo Deteniendo contenedores...
echo.
docker compose down
echo.
echo Contenedores detenidos.
echo.
pause
goto menu

:limpiar
echo.
echo ======================================================
echo   ADVERTENCIA: Se borrara la base de datos completa.
echo   Se perderan todos los cursos y usuarios creados.
echo ======================================================
echo.
set /p confirmar="¿Estas seguro? (S/N): "
if /i "%confirmar%" neq "S" goto menu

echo.
echo Limpiando volumenes y contenedores...
echo.
docker compose down -v
echo.
echo Sistema limpiado. La proxima vez que inicies (Opcion 1),
echo se creara la base de datos desde cero con el nuevo esquema.
echo.
pause
goto menu

:salir
endlocal
exit /b 0

:fin
echo.
echo Stack detenido o parado manualmente.
echo.
echo URLs de acceso:
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo Base de datos: localhost:5432
echo.
echo Nota: Presiona Ctrl+C para detener los contenedores desde esta ventana.
echo.
pause
goto menu