#!/usr/bin/env bash
# Tags a release whose commit includes the built dist/, so the plugin can be
# installed from GitHub without a build step. Run on a clean main.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p 'require("./package.json").version')
tag="v$version"
if [ -n "$(git status --porcelain)" ]; then echo "working tree not clean" >&2; exit 1; fi
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then echo "$tag already exists" >&2; exit 1; fi
base=$(git rev-parse HEAD)
npm run build
git checkout -q --detach
git add -f dist
git commit -q -m "Release $tag (built dist)"
git tag -a "$tag" -m "pandacss-plugin-qwik $tag"
git checkout -q -
echo "tagged $tag on top of $base; push with: git push origin $tag"
