#!/usr/bin/env bash
# Full suite: ES3 syntax lint, then the engine behaviour tests.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node tests/es3-lint.js
node tests/engine.test.js
