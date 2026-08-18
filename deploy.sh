#!/usr/bin/env bash
# ==============================================================================
# deploy.sh — versao para Mac/Linux/Git Bash do push.bat.
# Envia as alteracoes do site para o GitHub em um unico comando.
#
# Uso:
#   ./deploy.sh                  -> pede a mensagem de commit interativamente
#   ./deploy.sh "minha mensagem" -> usa a mensagem passada direto
#
# Se estiver no Windows com GitHub Desktop instalado, feche-o antes de rodar
# este script para evitar o erro de "lock file" preso (.git/index.lock).
# ==============================================================================
set -e
cd "$(dirname "$0")"

echo ""
echo "=================================================="
echo "  MCJ Capital Invest - Enviando alteracoes p/ GitHub"
echo "=================================================="
echo ""

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ERRO] Esta pasta nao parece ser um repositorio Git."
  exit 1
fi

if [ -f ".git/index.lock" ]; then
  echo "[AVISO] Foi encontrado um arquivo de lock preso (.git/index.lock)."
  echo "Feche o GitHub Desktop (inclusive na bandeja do sistema) e rode este"
  echo "script novamente."
  exit 1
fi

echo "Verificando alteracoes..."
git add -A

if git diff --cached --quiet; then
  echo "Nao ha alteracoes novas para enviar. Nada a fazer."
  exit 0
fi

MSG="$1"
if [ -z "$MSG" ]; then
  read -r -p "Mensagem do commit (Enter = usar mensagem padrao): " MSG
fi
if [ -z "$MSG" ]; then
  MSG="Atualizacoes no site ($(date '+%Y-%m-%d %H:%M'))"
fi

git commit -m "$MSG"

echo ""
echo "Enviando para o GitHub..."
git push

echo ""
echo "=================================================="
echo "  Envio concluido com sucesso!"
echo "=================================================="
