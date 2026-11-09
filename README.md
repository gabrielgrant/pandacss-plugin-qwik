# pandacss-plugin-qwik

A [Panda CSS](https://panda-css.com) 2 plugin that adds Qwik 2 (`@qwik.dev/core`) JSX support:
the `styled` factory, JSX pattern components, `createRecipeContext`, `createSlotRecipeContext`
and the JSX types. It works with the published `@pandacss/dev`, through Panda's plugin hooks only.

Panda 2 dropped its Qwik target. Native support is being worked on in
[gabrielgrant/panda `claude/v2-qwik-jsx`](https://github.com/gabrielgrant/panda/tree/claude/v2-qwik-jsx).
This plugin is meant as the way to use it on stock Panda until then.

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

## How it works

In `config:resolved` the plugin hands Panda `jsxFramework: 'solid'`. Solid is the closest built-in
target: Panda then still emits its config-derived `is-valid-prop` and framework-neutral helpers, and
its transform uses the `class` attribute like Qwik does. In `codegen:prepare` the plugin replaces the
Solid-specific files with Qwik ones.

The rewrite depends on the shape of Panda's generated output, so each Panda release needs checking.
`peerDependencies` pins the supported range.

## Development

```bash
npm ci
npm test          # unit and snapshot tests against the pinned @pandacss/dev
npm run typecheck
npm run build
```

`example/` is a Qwik Router app that uses the plugin from `file:..`. Its e2e script drives the app in
Chromium over SSR and resume:

```bash
cd example
npm ci
npm run dev        # then, in another shell: npm run e2e
npm run preview    # then: npm run e2e -- http://127.0.0.1:5352
```

## License

MIT. Parts of the generated runtime are adapted from Panda CSS; see [LICENSE](./LICENSE).
