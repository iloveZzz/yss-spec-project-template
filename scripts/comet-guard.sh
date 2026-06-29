#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
PYTHONPATH="${PYTHONPATH:-}:$(pwd)" python3 -m ysscomet_lifecycle.guard "$@"
