import { createNodeDriver } from '@pandacss/dev/node'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { afterAll, describe, expect, test } from 'vitest'

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

describe('pandacss-plugin-qwik', () => {
  test('replaces the Solid runtime with Qwik artifacts and keeps Panda helpers', async () => {
    const { read, files } = await codegen()
    const jsxFiles = files.filter((file) => file.startsWith('jsx/') || file === 'types/jsx.d.ts')

    for (const file of jsxFiles) {
      const code = read(file)
      expect(code, file).not.toContain('solid-js')
      expect(syntaxErrors(code, file), file).toEqual([])
    }

    expect(files).toContain('jsx/context-hosts.qwik.js')
    expect(read('jsx/factory.js')).toContain("import { jsx } from '@qwik.dev/core';")
    expect(read('jsx/context-hosts.qwik.js')).toContain('component$(')
    expect(read('jsx/create-slot-recipe-context.js')).not.toContain('component$')
    expect(read('jsx/helper.js')).toContain('export function splitJsxProps')
    expect(read('jsx/is-valid-prop.js')).toContain('"marginTop"')
    expect(read('types/index.d.ts')).toContain("export * from './jsx';")
    expect(read('types/jsx.d.ts')).toContain('export type Styled = JsxFactory & JsxElements')
    expect(read('jsx/index.d.ts')).toContain('export { HTMLStyledProps, StyledComponent, Styled, StyledVariantProps')
  })

  test('generated runtime files', async () => {
    const { read } = await codegen()
    await expect(read('jsx/factory.js')).toMatchFileSnapshot('__snapshots__/factory.js')
    await expect(read('jsx/context-hosts.qwik.js')).toMatchFileSnapshot('__snapshots__/context-hosts.qwik.js')
    await expect(read('jsx/create-slot-recipe-context.js')).toMatchFileSnapshot('__snapshots__/create-slot-recipe-context.js')
    await expect(read('jsx/create-recipe-context.js')).toMatchFileSnapshot('__snapshots__/create-recipe-context.js')
    await expect(read('jsx/stack.js')).toMatchFileSnapshot('__snapshots__/stack.js')
    await expect(read('jsx/stack.d.ts')).toMatchFileSnapshot('__snapshots__/stack.d.ts')
    await expect(read('types/jsx.d.ts')).toMatchFileSnapshot('__snapshots__/jsx.d.ts')
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

  test('follows outExtension, forceImportExtension and jsxFactory', async () => {
    const { read, files } = await codegen({ outExtension: 'mjs', forceImportExtension: true, jsxFactory: 'panda' })
    expect(files).toContain('jsx/context-hosts.qwik.mjs')
    expect(read('jsx/factory.mjs')).toContain("from '../css/index.mjs';")
    expect(read('jsx/factory.mjs')).toContain('export const panda = ')
    expect(read('jsx/create-slot-recipe-context.mjs')).toContain("from './context-hosts.qwik.mjs';")
    expect(read('jsx/context-hosts.qwik.mjs')).toContain("import { panda } from './factory.mjs';")
    expect(read('jsx/stack.mjs')).toContain("import { stackRaw } from '../patterns/stack.mjs';")
    expect(read('types/jsx.d.mts')).toContain('export type Panda = JsxFactory & JsxElements')
    expect(read('types/jsx.d.mts')).toContain('export type HTMLPandaProps<')
    expect(read('types/jsx.d.mts')).toContain("from './system.mjs';")
  })

  test('rejects other JSX frameworks', async () => {
    await expect(codegen({ jsxFramework: 'react' })).rejects.toThrow("set `jsxFramework: 'qwik'`")
  })
})
