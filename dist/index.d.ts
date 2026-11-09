import { rewriteArtifacts } from './rewrite.js';
export type { Artifact, ArtifactFile, RewriteOptions } from './rewrite.js';
export { rewriteArtifacts };
/**
 * Generates Qwik 2 JSX artifacts (`styled`, pattern components, `createRecipeContext`,
 * `createSlotRecipeContext` and the JSX types).
 *
 * Set `jsxFramework: 'qwik'` in the config. The plugin hands Panda `'solid'` instead, so Panda
 * still emits its config-derived `is-valid-prop` and the framework-neutral helpers, and the
 * transform uses `class` like Qwik does. The Solid-specific files are then replaced.
 */
export declare function pluginQwik(): import("@pandacss/types").PandaPlugin;
export default pluginQwik;
