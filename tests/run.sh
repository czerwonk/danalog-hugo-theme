#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
npx --no-install tsc -p .
node --test tests/js/*.test.ts tests/js/*.test.mjs
tests/build.test.sh
