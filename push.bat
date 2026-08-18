@echo off
REM ============================================================================
REM push.bat — envia as alteracoes do site para o GitHub em um unico clique.
REM ============================================================================
REM Como usar:
REM   1. Feche o GitHub Desktop antes de rodar este script (evita o erro de
REM      "lock file" preso, que acontece quando dois programas tentam mexer
REM      no repositorio Git ao mesmo tempo).
REM   2. De um duplo-clique neste arquivo (push.bat), OU abra um terminal
REM      (PowerShell/CMD) dentro desta pasta e rode: push.bat
REM   3. Se pedir uma mensagem de commit, digite algo curto (ex: "ajustes no
REM      site") e aperte Enter. Se preferir, so aperte Enter para usar uma
REM      mensagem padrao com a data/hora.
REM ============================================================================

cd /d "%~dp0"

echo.
echo ==================================================
echo   MCJ Capital Invest - Enviando alteracoes p/ GitHub
echo ==================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Esta pasta nao parece ser um repositorio Git.
  echo Verifique se este arquivo esta na pasta correta do projeto.
  pause
  exit /b 1
)

if exist ".git\index.lock" (
  echo [AVISO] Foi encontrado um arquivo de lock preso ^(.git\index.lock^).
  echo Feche o GitHub Desktop ^(inclusive na bandeja do sistema^) e rode este
  echo script novamente. Se o problema continuar, apague manualmente o
  echo arquivo ".git\index.lock" com o GitHub Desktop fechado e tente de novo.
  pause
  exit /b 1
)

echo Verificando alteracoes...
git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo Nao ha alteracoes novas para enviar. Nada a fazer.
  pause
  exit /b 0
)

set /p MSG="Mensagem do commit (Enter = usar mensagem padrao): "
if "%MSG%"=="" set MSG=Atualizacoes no site (%date% %time%)

git commit -m "%MSG%"
if errorlevel 1 (
  echo [ERRO] Falha ao criar o commit. Veja a mensagem acima.
  pause
  exit /b 1
)

echo.
echo Enviando para o GitHub...
git push

if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao enviar para o GitHub. Causas comuns:
  echo   - Sem conexao com a internet
  echo   - Precisa fazer login/autenticar de novo ^(abra o GitHub Desktop uma
  echo     vez para reautenticar e feche em seguida^)
  echo   - Alguem enviou alteracoes que voce ainda nao tem localmente
  echo     ^(nesse caso, abra o GitHub Desktop e clique em "Fetch/Pull" antes^)
  pause
  exit /b 1
)

echo.
echo ==================================================
echo   Envio concluido com sucesso!
echo ==================================================
pause
