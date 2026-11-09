import type { JsxStylePropsMode } from './templates/render.js';
export type { ModuleFormat } from './templates/render.js';
export interface ArtifactFile {
    path: string;
    code: string;
    dependencies: string[];
}
export interface Artifact {
    id: string;
    files: ArtifactFile[];
}
export interface RewriteOptions {
    /** The config's `jsxStyleProps`; picks how slot styles from an `sva` recipe are applied. */
    jsxStyleProps?: JsxStylePropsMode | undefined;
}
/**
 * Replaces the Solid flavoured JSX artifacts Panda emitted with Qwik ones. Panda's
 * framework-neutral files (`jsx/helper`, `jsx/is-valid-prop`, `jsx/factory.d.ts`) are kept.
 */
export declare function rewriteArtifacts(artifacts: Artifact[], options?: RewriteOptions): Artifact[];
