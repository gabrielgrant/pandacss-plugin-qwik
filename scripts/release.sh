#!/usr/bin/env bash
# Publishes a release ref whose commit includes the built dist/, so the plugin
# can be installed from GitHub without a build step. Run on a clean main.
# Releases are branches (release/v<version>) rather than tags, so they can be
# pushed from environments that only allow branch pushes. Never move one.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p 'require("./package.json").version')
ref="release/v$version"
if [ -n "$(git status --porcelain)" ]; then echo "working tree not clean" >&2; exit 1; fi
if git rev-parse -q --verify "refs/heads/$ref" >/dev/null; then echo "$ref already exists" >&2; exit 1; fi
base=$(git rev-parse HEAD)
npm run build
git checkout -q --detach
git add -f dist
git commit -q -m "Release v$version (built dist)"
git branch "$ref"
git checkout -q -
echo "created $ref on top of $base; push with: git push origin $ref"
