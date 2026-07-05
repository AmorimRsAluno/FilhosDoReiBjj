@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Filhos do Rei BJJ - Demo Cliente

set "ROOT=%~dp0"
set "WEB_URL=http://localhost:5173/?demo=login"
set "MOBILE_URL=http://localhost:5173/demo-mobile.html"

echo.
echo ================================================
echo  FILHOS DO REI BJJ - WILLIAM LAGO
echo  Abrir sistema demonstrativo
echo ================================================
echo.
echo Escolha o modo de visualizacao:
echo.
echo   1 - Web / Painel administrativo
echo   2 - Mobile / App do aluno em moldura de celular
echo.
choice /C 12 /N /M "Digite 1 ou 2: "
if errorlevel 2 goto MOBILE
if errorlevel 1 goto WEB

:WEB
set "DEMO_URL=%WEB_URL%"
set "DEMO_MODE=WEB"
goto START_APP

:MOBILE
set "DEMO_URL=%MOBILE_URL%"
set "DEMO_MODE=MOBILE"
goto START_APP

:START_APP
echo.
echo Modo selecionado: %DEMO_MODE%
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js/npm nao encontrado no PATH.
  echo Instale o Node.js ou abra por um terminal onde npm.cmd esteja disponivel.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias. Isso pode demorar na primeira vez...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo ERRO: Falha ao instalar dependencias.
    echo.
    pause
    exit /b 1
  )
)

echo Preparando banco de dados demonstrativo...
call npm.cmd run db:setup
if errorlevel 1 (
  echo.
  echo ERRO: Nao foi possivel preparar o banco.
  echo Confira se o PostgreSQL esta aberto e se o banco bjjapk existe.
  echo.
  pause
  exit /b 1
)

call :CHECK_APP
if errorlevel 1 (
  echo Iniciando servidor do sistema em uma nova janela...
  start "Filhos do Rei BJJ - Servidor" cmd /k "cd /d ""%ROOT%"" && npm.cmd run dev"
  echo Aguardando o sistema ficar online...

  for /L %%I in (1,1,40) do (
    call :CHECK_APP
    if not errorlevel 1 goto OPEN_APP
    timeout /t 1 /nobreak >nul
  )

  echo.
  echo ERRO: O sistema nao respondeu em http://localhost:5173.
  echo Verifique a janela "Filhos do Rei BJJ - Servidor" para detalhes.
  echo.
  pause
  exit /b 1
) else (
  echo Sistema ja esta rodando.
)

:OPEN_APP
echo.
echo Abrindo: %DEMO_URL%
start "" "%DEMO_URL%"
echo.
echo Logins para demonstracao:
echo   Admin: admin@filhosdorei.com / 123456
echo   Aluno: ana@aluno.com / 123456
echo.
echo Para encerrar depois, feche a janela "Filhos do Rei BJJ - Servidor".
echo.
pause
exit /b 0

:CHECK_APP
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $api = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:3333/api/health').StatusCode -eq 200 } catch { $api = $false }; try { $web = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:5173').StatusCode -eq 200 } catch { $web = $false }; if ($api -and $web) { exit 0 } else { exit 1 }"
exit /b %errorlevel%
