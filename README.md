# pandacss-plugin-qwik

A [Panda CSS](https://panda-css.com) 2 plugin that adds Qwik 2 (`@qwik.dev/core`) JSX support:
the `styled` factory, JSX pattern components, `createRecipeContext`, `createSlotRecipeContext`
and the JSX types. It works with the published `@pandacss/dev`, through Panda's plugin hooks only.

Panda 2 has no Qwik target yet. Native support is being worked on in
[gabrielgrant/panda `claude/v2-qwik-jsx`](https://github.com/gabrielgrant/panda/tree/claude/v2-qwik-jsx).
This plugin emits the same files as that branch, byte for byte, so moving to native support later
only means removing the plugin from `plugins`.

## Usage

```ts
// panda.config.ts
import { defineConfig } from '@pandacss/dev'
import pluginQwik from 'pandacss-plugin-qwik'

export default defineConfig({
  jsxFramework: 'qwik',
  plugins: [pluginQwik()],
  // ...
})
```

All `outExtension` values (`js`, `mjs`, `ts`), `forceImportExtension`, `jsxFactory` and `jsxStyleProps` modes are
supported. Checked against `@pandacss/dev` 2.5.0 and `@qwik.dev/core` 2.0.0-rc.5.

## Recipe contexts in Qwik

`createSlotRecipeContext` and `createRecipeContext` have the same API as Panda's React output (`withProvider`,
`withContext`, `withRootProvider`, `PropsProvider`, `usePropsContext`). Qwik adds a few rules:

- Call them, and the `with*` functions, at module top level.
- `usePropsContext` is a hook: call it inside a `component$`.
- Parts can wrap tags, `component$` components and plain function components, and their options (including
  `defaultProps` and `shouldForwardProp`) don't need to be serializable.
- Context ids come from the recipe name (or a hash of an `sva`/`cva` config), because they must be the same on the
  server and on a resumed client. If one recipe backs more than one context, give each an `id`:

  ```ts
  const menu = createSlotRecipeContext(card, { id: 'menu' })
  ```

  In development, a second call for the same recipe without an `id` logs a warning, since both would share one Qwik
  context.

## How it works

In `config:resolved` the plugin hands Panda `jsxFramework: 'solid'`. Solid is the closest built-in target: Panda
still emits its config-derived `is-valid-prop` and framework-neutral helpers, and its source transform writes the
`class` attribute like Qwik does. In `codegen:prepare` the plugin replaces the Solid-specific files (factory,
recipe contexts, pattern components, JSX types) with the Qwik ones, and names the recipe-context modules
`*.qwik.js` so the Qwik optimizer transforms them. With a design system package, the re-exported runtime is kept.

The templates in `src/templates` are the native branch's TypeScript source with the type-only parts marked, so one
source gives both the `.ts` and the `.js` output. `__tests__/upstream` holds the native branch's output for seven
option sets, and the tests check the plugin produces exactly those files.

The rewrite reads names and paths from Panda's generated Solid files, so each Panda release needs checking; when a
shape it relies on changes, codegen fails with an error naming the file.

## Known limitations

These come from Panda or Qwik and apply to native support too:

- `class` must be a string on `styled` and recipe-context components. An array or object `class` is dropped.
- With `pandacss({ transform: true })`, Panda's transform rewrites the `cva()` call inside the generated factory, so
  `styled(el, { base, variants })` with an inline config renders without its classes
  ([repro](https://github.com/gabrielgrant/panda-repro-transform-rewrites-factory-cva)). Use config recipes or leave
  the transform off.

## Development

```bash
npm ci
npm test          # parity with the native output, plus Panda's Qwik SSR and type tests run on this plugin's output
npm run typecheck
npm run build
```

`example/` is a Qwik Router app that uses the plugin from `file:..` (run `npm run build` first). Its e2e script starts
the server and drives the app in Chromium over SSR and resume, including the `/minimal/` and `/none/` pages built with
those `jsxStyleProps` modes:

```bash
cd example
npm ci
npm run e2e                                              # dev server
npm run build.client && npm run build.preview && npm run e2e -- preview
```

## License

MIT. Parts of the generated runtime are adapted from Panda CSS; see [LICENSE](./LICENSE).
