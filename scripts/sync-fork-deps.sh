#!/usr/bin/env bash
# sync-fork-deps.sh — Re-apply fork-specific dependencies after an upstream merge.
#
# Usage:
#   After resolving package.json conflicts during an upstream sync,
#   run this script to ensure all fork deps are present:
#
#     bash scripts/sync-fork-deps.sh
#
# What it does:
#   1. Installs fork-specific dependencies from fork-deps.json
#   2. Moves three.js packages to devDependencies (Vercel function size)
#   3. Patches the build script to use --webpack flag
#   4. Runs npm install to regenerate lockfile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FORK_DEPS="$SCRIPT_DIR/fork-deps.json"

if [ ! -f "$FORK_DEPS" ]; then
  echo "Error: fork-deps.json not found at $FORK_DEPS"
  exit 1
fi

cd "$ROOT_DIR"

echo "==> Installing fork-specific dependencies..."
# Read deps from fork-deps.json and install them
DEPS=$(node -e "
  const f = require('$FORK_DEPS');
  const deps = Object.entries(f.dependencies || {}).map(([k,v]) => k + '@' + v);
  console.log(deps.join(' '));
")
if [ -n "$DEPS" ]; then
  npm install --save $DEPS
fi

echo "==> Moving three.js packages to devDependencies..."
MOVE_DEPS=$(node -e "
  const f = require('$FORK_DEPS');
  console.log((f.moveToDev || []).join(' '));
")
if [ -n "$MOVE_DEPS" ]; then
  # Remove from dependencies, add to devDependencies
  for pkg in $MOVE_DEPS; do
    # Get current version from package.json dependencies
    VERSION=$(node -e "const p = require('./package.json'); console.log(p.dependencies?.['$pkg'] || '')")
    if [ -n "$VERSION" ]; then
      npm install --save-dev "$pkg@$VERSION"
      # npm install --save-dev already moves it, but ensure it's removed from deps
      node -e "
        const fs = require('fs');
        const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (p.dependencies?.['$pkg']) { delete p.dependencies['$pkg']; }
        fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
      "
    fi
  done
fi

echo "==> Patching build script..."
node -e "
  const fs = require('fs');
  const f = require('$FORK_DEPS');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  Object.assign(p.scripts, f.scripts || {});
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"

echo "==> Running npm install..."
npm install

echo "==> Done! Fork dependencies synced."
echo "    Run 'npm run build' to verify."
