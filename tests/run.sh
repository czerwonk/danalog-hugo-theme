#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
node --test tests/js/*.test.mjs
tests/build.test.sh
