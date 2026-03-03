#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="${BOT_DIR:-"$(cd "${SCRIPT_DIR}/.." && pwd)"}"
cd "${BOT_DIR}"

# Source environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Run the bot
exec "${BUN:-bun}" run src/index.ts
