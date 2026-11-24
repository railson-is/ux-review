#!/usr/bin/env bash
# Instala o subagente ux-review.
#   agents/ux-review.md -> <destino>/agents/ux-review.md
#   suporte/            -> <destino>/ux-review/
# Destino padrão: $CLAUDE_CONFIG_DIR ou ~/.claude
#
# Uso: ./instalar.sh [--destino <pasta>] [--sem-dependencias]
set -euo pipefail

ORIGEM="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SEM_DEPENDENCIAS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --destino) BASE="$2"; shift 2 ;;
    --sem-dependencias) SEM_DEPENDENCIAS=1; shift ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; exit 2 ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 ou mais novo é necessário: https://nodejs.org/" >&2
  exit 1
fi
MAIOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$MAIOR" -lt 20 ]; then
  echo "Node.js $MAIOR encontrado; o Playwright usado aqui exige 20 ou mais novo." >&2
  exit 1
fi

APOIO="$BASE/ux-review"
AGENTES="$BASE/agents"
mkdir -p "$AGENTES" "$APOIO"

# Atualiza a pasta de apoio sem apagar node_modules.
find "$APOIO" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
cp -R "$ORIGEM/suporte/." "$APOIO/"

# Caminho absoluto com barras normais (no Git Bash do Windows, vira C:/...).
CAMINHO="$(cd "$APOIO" && pwd)"
if command -v cygpath >/dev/null 2>&1; then CAMINHO="$(cygpath -m "$CAMINHO")"; fi
ESCAPADO="$(printf '%s' "$CAMINHO" | sed 's/[&|\\]/\\&/g')"
sed "s|{{UX_REVIEW_DIR}}|$ESCAPADO|g" "$ORIGEM/agents/ux-review.md" > "$AGENTES/ux-review.md"

echo "Agente:  $AGENTES/ux-review.md"
echo "Apoio:   $APOIO"

if [ "$SEM_DEPENDENCIAS" -eq 0 ]; then
  echo "Instalando axe-core e Playwright pelo npm..."
  (cd "$APOIO" && npm ci --no-audit --no-fund)
  echo "Instalando o Chromium do Playwright..."
  (cd "$APOIO" && npx playwright install chromium)
else
  echo "Dependências não instaladas (--sem-dependencias). Rode depois: cd \"$APOIO\" && npm ci && npx playwright install chromium"
fi

echo "Pronto. Abra uma nova sessão do Claude Code para o agente aparecer."
