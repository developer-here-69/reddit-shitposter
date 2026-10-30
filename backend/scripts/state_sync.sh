#!/usr/bin/env bash
# Git Bash / Linux helper. GitHub Actions uses scripts/state_sync.py.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export STATE_DIR="${STATE_DIR:-$ROOT/state}"
python3 "$ROOT/scripts/state_sync.py" "${1:-push}"
