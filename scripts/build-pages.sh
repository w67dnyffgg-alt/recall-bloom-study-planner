#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# npm supplies pinned Bun on the hosting build machine. No account credentials required.
npm exec --yes --package=bun@1.3.3 -- bun install --frozen-lockfile
npm exec --yes --package=bun@1.3.3 -- bun run build:pages
