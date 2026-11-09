import { createNodeDriver } from '@pandacss/dev/node'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { afterAll, describe, expect, test } from 'vitest'
import { rewriteArtifacts } from '../src/rewrite'

const root = resolve(__dirname, '.tmp')
const pluginEntry = resolve(__dirname, '../src/index.ts')
let count = 0

afterAll(() => rmSync(root, { recursive: true, force: true }))

async function codegen(options: Record<string, unknown> = {}) {
  const cwd = join(root, `case-${++count}`)
  mkdirSync(cwd, { recursive: true })
  const config = JSON.stringify({ include: [], outdir: 'out', jsxFramework: 'qwik', ...options })
  writeFileSync(
    join(cwd, 'panda.config.mjs'),
    `import { defineConfig } from '@pandacss/dev'
import presetBase from '@pandacss/preset-base'
import pluginQwik from ${JSON.stringify(pluginEntry)}
export default defineConfig({ ...${config}, presets: [presetBase], plugins: [pluginQwik()] })
`,
  )
  const driver = await createNodeDriver({ cwd, configPath: 'panda.config.mjs' })
  driver.codegen({ outdir: join(cwd, 'out') })
  const read = (path: string) => readFileSync(join(cwd, 'out', path), 'utf8')
  const files = readdirSync(join(cwd, 'out'), { recursive: true }).map(String)
  return { read, files }
}

const syntaxErrors = (code: string, fileName: string) => {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false, fileName.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS)
  return (source as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics.map((d) => d.messageText)
}

// Output of Panda's native Qwik codegen (gabrielgrant/panda, branch claude/v2-qwik-jsx at e909f7f5)
// for the same options. The plugin must emit the same files byte for byte.
const upstream = resolve(__dirname, 'upstream')
const upstreamCases: Record<string, Record<string, unknown>> = {
  js: {},
  ts: { outExtension: 'ts' },
  mjs: { outExtension: 'mjs', forceImportExtension: true, jsxFactory: 'panda' },
  'minimal-js': { jsxStyleProps: 'minimal' },
  'minimal-ts': { jsxStyleProps: 'minimal', outExtension: 'ts' },
  'none-js': { jsxStyleProps: 'none' },
  'none-ts': { jsxStyleProps: 'none', outExtension: 'ts' },
}

describe('pandacss-plugin-qwik', () => {
  test.each(Object.entries(upstreamCases))('matches the native Qwik output (%s)', async (name, options) => {
    const { read } = await codegen(options)
    const files = readdirSync(join(upstream, name), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(join(upstream, name).length + 1))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(read(file), file).toBe(readFileSync(join(upstream, name, file), 'utf8'))
  })

  test('replaces the Solid runtime with Qwik artifacts and keeps Panda helpers', async () => {
    const { read, files } = await codegen()
    const jsxFiles = files.filter((file) => file.startsWith('jsx/') || file === 'types/jsx.d.ts')

    for (const file of jsxFiles) {
      const code = read(file)
      expect(code, file).not.toContain('solid-js')
      expect(syntaxErrors(code, file), file).toEqual([])
    }

    expect(files).toContain('jsx/create-slot-recipe-context.qwik.js')
    expect(files).toContain('jsx/create-recipe-context.qwik.d.ts')
    expect(files).not.toContain('jsx/create-slot-recipe-context.js')
    expect(read('jsx/create-slot-recipe-context.qwik.js')).toContain('component$(')
    expect(read('jsx/index.js')).toContain("export * from './create-slot-recipe-context.qwik';")
    expect(read('jsx/helper.js')).toContain('export function splitJsxProps')
    expect(read('jsx/is-valid-prop.js')).toContain('"marginTop"')
    expect(read('types/index.d.ts')).toContain("export * from './jsx';")
  })

  test('pattern bodies follow jsxStyleProps', async () => {
    const minimal = await codegen({ jsxStyleProps: 'minimal' })
    expect(minimal.read('jsx/stack.js')).toContain("import { mergeCss } from '../css/css';")
    expect(minimal.read('jsx/stack.js')).toContain('{ ...restProps, css: mergeCss(styleProps, props.css) }')

    const none = await codegen({ jsxStyleProps: 'none' })
    expect(none.read('jsx/stack.js')).not.toContain('mergeCss')
    expect(none.read('jsx/stack.js')).toContain('{ ...restProps, css: styleProps }')
    expect(none.read('jsx/is-valid-prop.js')).not.toContain('"marginTop"')
  })

  test('keeps a design system\'s re-exported runtime, pointing contexts at its .qwik modules', () => {
    const file = (path: string, code: string) => ({ path, code, dependencies: [] })
    const reexport = (name: string) => `export * from '@acme/ds/jsx/${name}';`
    const artifacts = rewriteArtifacts([
      { id: 'jsx-factory', files: [file('jsx/factory.js', reexport('factory')), file('jsx/factory.d.ts', reexport('factory'))] },
      { id: 'jsx-create-recipe-context', files: [file('jsx/create-recipe-context.js', reexport('create-recipe-context'))] },
      {
        id: 'jsx-create-slot-recipe-context',
        files: [file('jsx/create-slot-recipe-context.d.ts', reexport('create-slot-recipe-context'))],
      },
      {
        id: 'jsx-index',
        files: [
          file('jsx/index.js', "export * from './factory';\nexport * from './create-recipe-context';\nexport * from './create-slot-recipe-context';"),
          file('jsx/index.d.ts', "export * from './create-recipe-context';\nexport { HTMLStyledProps, StyledComponent, Styled, StyledVariantProps, JsxFactoryOptions } from '../types/jsx';"),
        ],
      },
      { id: 'jsx-patterns', files: [] },
      { id: 'types', files: [] },
    ])
    const files = Object.fromEntries(artifacts.flatMap((artifact) => artifact.files).map((f) => [f.path, f.code]))
    expect(files['jsx/factory.js']).toBe(reexport('factory'))
    expect(files['jsx/create-recipe-context.qwik.js']).toBe(reexport('create-recipe-context.qwik'))
    expect(files['jsx/create-slot-recipe-context.qwik.d.ts']).toBe(reexport('create-slot-recipe-context.qwik'))
    expect(files['jsx/index.js']).toContain("export * from './create-slot-recipe-context.qwik';")
  })

  test('rejects other JSX frameworks', async () => {
    await expect(codegen({ jsxFramework: 'react' })).rejects.toThrow("set `jsxFramework: 'qwik'`")
  })
})
