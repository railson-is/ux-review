#!/usr/bin/env bash
# Atalho para quem clonou o repositório. A instalação de verdade está em
# bin/ux-review.mjs, o mesmo código usado por "npx github:railson-is/ux-review instalar".
#
# Uso: ./instalar.sh [--destino <pasta>] [--sem-dependencias]
set -euo pipefail
ORIGEM="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 ou mais novo é necessário: https://nodejs.org/" >&2
  exit 1
fi
exec node "$ORIGEM/bin/ux-review.mjs" instalar "$@"
