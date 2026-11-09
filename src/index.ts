import { definePlugin } from '@pandacss/dev'
import { rewriteArtifacts, type Artifact, type RewriteOptions } from './rewrite.js'

export type { Artifact, ArtifactFile, RewriteOptions } from './rewrite.js'
export { rewriteArtifacts }

/**
 * Generates Qwik 2 JSX artifacts (`styled`, pattern components, `createRecipeContext`,
 * `createSlotRecipeContext` and the JSX types).
 *
 * Set `jsxFramework: 'qwik'` in the config. The plugin hands Panda `'solid'` instead, so Panda
 * still emits its config-derived `is-valid-prop` and the framework-neutral helpers, and the
 * transform uses `class` like Qwik does. The Solid-specific files are then replaced.
 */
export function pluginQwik(): ReturnType<typeof definePlugin> {
  const options: RewriteOptions = {}
  return definePlugin({
    name: 'pandacss-plugin-qwik',
    hooks: {
      'config:resolved': ({ config }) => {
        options.jsxStyleProps = config.jsxStyleProps
        if (config.jsxFramework === 'qwik') return { ...config, jsxFramework: 'solid' }
        if (config.jsxFramework !== 'solid') {
          throw new Error(`pandacss-plugin-qwik: set \`jsxFramework: 'qwik'\` (got ${JSON.stringify(config.jsxFramework)})`)
        }
      },
      'codegen:prepare': ({ artifacts }) => rewriteArtifacts(artifacts as Artifact[], options),
    },
  })
}

export default pluginQwik
