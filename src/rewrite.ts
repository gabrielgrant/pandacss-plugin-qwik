import { contextHostsModule, recipeContextDts, recipeContextModule, slotRecipeContextDts, slotRecipeContextModule } from './templates/contexts.js'
import { factoryModule } from './templates/factory.js'
import { patternModule, type PatternInfo } from './templates/patterns.js'
import { jsxTypes } from './templates/types.js'

export interface ArtifactFile {
  path: string
  code: string
  dependencies: string[]
}

export interface Artifact {
  id: string
  files: ArtifactFile[]
}

export interface ModuleFormat {
  /** Extension of emitted JS files, e.g. `.js` or `.mjs`. */
  ext: string
  /** Suffix Panda appends to relative import specifiers (`forceImportExtension`), e.g. `''` or `.mjs`. */
  importExt: string
}

const fail = (message: string): never => {
  throw new Error(`pandacss-plugin-qwik: ${message}. This Panda version may not be supported.`)
}

const match = (code: string, re: RegExp, what: string, file: string) => re.exec(code) ?? fail(`cannot find ${what} in ${file}`)

const isDts = (path: string) => /\.d\.[mc]?ts$/.test(path)

/**
 * Replaces the Solid flavoured JSX artifacts Panda emitted with Qwik ones. Panda's
 * framework-neutral files (`jsx/helper`, `jsx/is-valid-prop`, `jsx/index`, `jsx/factory.d.ts`) are kept.
 */
export function rewriteArtifacts(artifacts: Artifact[]): Artifact[] {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]))
  const factory = byId.get('jsx-factory')
  if (!factory || factory.files.length === 0) {
    fail("no JSX artifacts were generated; set `jsxFramework: 'qwik'` and keep this plugin in `plugins`")
  }

  const factoryJs = factory!.files.find((file) => !isDts(file.path)) ?? fail('missing jsx/factory')
  const factoryDts = factory!.files.find((file) => isDts(file.path)) ?? fail('missing jsx/factory.d.ts')
  if (!factoryJs.code.includes("from 'solid-js")) fail('jsx/factory is not the Solid flavour')

  const format: ModuleFormat = {
    ext: match(factoryJs.path, /(\.[mc]?js)$/, 'file extension', factoryJs.path)[1],
    importExt: match(factoryJs.code, /from '\.\.\/css\/index((?:\.[mc]?js)?)'/, 'css import', factoryJs.path)[1],
  }
  const factoryName = match(factoryDts.code, /export declare const (\w+):/, 'factory name', factoryDts.path)[1]

  const replaceFiles = (id: string, map: (file: ArtifactFile) => ArtifactFile[] | ArtifactFile) => {
    const artifact = byId.get(id) ?? fail(`missing artifact "${id}"`)
    artifact.files = artifact.files.flatMap(map)
  }

  replaceFiles('jsx-factory', (file) => (isDts(file.path) ? file : { ...file, code: factoryModule(factoryName, format) }))

  const hostsPath = `jsx/context-hosts.qwik${format.ext}`
  replaceFiles('jsx-create-recipe-context', (file) => ({
    ...file,
    code: isDts(file.path) ? recipeContextDts(format) : recipeContextModule(format),
  }))
  replaceFiles('jsx-create-slot-recipe-context', (file) =>
    isDts(file.path)
      ? { ...file, code: slotRecipeContextDts(format) }
      : [
          { ...file, code: slotRecipeContextModule(format) },
          { ...file, path: hostsPath, code: contextHostsModule(factoryName, format) },
        ],
  )

  replaceFiles('jsx-patterns', (file) => {
    if (isDts(file.path)) {
      const code = file.code.replace("import type { Component } from 'solid-js';", "import type { Component } from '@qwik.dev/core';")
      if (code === file.code) fail(`cannot find the solid-js import in ${file.path}`)
      return { ...file, code }
    }
    return { ...file, code: patternModule(readPattern(file), format) }
  })

  replaceFiles('types', (file) => {
    if (!/^types\/jsx\.d\.[mc]?ts$/.test(file.path)) return file
    const index = byId.get('jsx-index')?.files.find((f) => isDts(f.path)) ?? fail('missing jsx/index.d.ts')
    const names = match(index.code, /export \{ (\w+), (\w+), (\w+), (\w+), /, 'type exports', index.path)
    return { ...file, code: jsxTypes({ htmlProps: names[1], component: names[2], upper: names[3], variantProps: names[4] }, format) }
  })

  return artifacts
}

function readPattern(file: ArtifactFile): PatternInfo {
  const { code, path } = file
  const [, jsxName] = match(code, /export const (\w+) = \/\* @__PURE__ \*\/ function \1\(props\)/, 'component name', path)
  const [, rawName, rawPath] = match(code, /import \{ (\w+) \} from '(\.\.\/patterns\/[^']+)';/, 'pattern import', path)
  const [, factoryName, factoryPath] = match(code, /import \{ (\w+) \} from '(\.\/factory[^']*)';/, 'factory import', path)
  const [, keys] = match(code, /splitProps\(props, (\[[^\]]*\])\)/, 'pattern keys', path)
  const [, element] = match(code, /createComponent\(\w+\[("[^"]+")\]/, 'jsx element', path)
  const mergeCss = /import \{ mergeCss \} from '([^']+)';/.exec(code)?.[1]
  const mode = mergeCss ? 'minimal' : /return \{ css: styleProps \}/.test(code) ? 'none' : 'all'
  return { jsxName, rawName, rawPath, factoryName, factoryPath, keys, element, mode, mergeCssPath: mergeCss }
}
