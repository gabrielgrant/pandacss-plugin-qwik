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
# Every package the published code or types import must be declared, or a
# consumer's hoisted copy (possibly another major version) gets used instead.
node -e '
const fs = require("fs"), path = require("path")
const pkg = require("./package.json")
const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})])
const files = []
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p) } }
walk("dist")
// templates/*.js hold generated code as strings, so their import lines are not real imports
const checked = files.filter((f) => f.endsWith(".d.ts") || !f.startsWith(path.join("dist", "templates")))
const bad = new Set()
for (const f of checked) {
  const src = fs.readFileSync(f, "utf8")
  for (const m of src.matchAll(/(?:^import[^\n]*?from |^export[^\n]*?from |import\()["\x27]([^"\x27.][^"\x27]*)["\x27]/gm)) {
    const name = m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0]
    if (!declared.has(name) && !name.startsWith("node:")) bad.add(name + " (" + f + ")")
  }
}
if (bad.size) { console.error("undeclared imports in dist:\n  " + [...bad].join("\n  ")); process.exit(1) }
'
git checkout -q --detach
git add -f dist
git commit -q -m "Release v$version (built dist)"
git branch "$ref"
git checkout -q -
echo "created $ref on top of $base; push with: git push origin $ref"
