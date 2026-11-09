import { recipeContextDts, recipeContextModule, slotRecipeContextDts, slotRecipeContextModule } from './templates/contexts.js';
import { factoryModule } from './templates/factory.js';
import { patternModule } from './templates/patterns.js';
import { jsxTypes } from './templates/types.js';
const fail = (message) => {
    throw new Error(`pandacss-plugin-qwik: ${message}. This Panda version may not be supported.`);
};
const match = (code, re, what, file) => re.exec(code) ?? fail(`cannot find ${what} in ${file}`);
const isDts = (path) => /\.d\.[mc]?ts$/.test(path);
// Qwik's optimizer only transforms `component$` in `.ts`/`.tsx`/`.jsx` or `*.qwik.{js,mjs,cjs}`
// files, so the recipe-context modules get the `.qwik` infix, as in Panda's native Qwik output.
const qwikPath = (path) => path.replace(/(\.d)?(\.[mc]?[jt]s)$/, '.qwik$1$2');
// With a design system package (`panda lib`), Panda emits the shared JSX runtime as a re-export
// of the package's copy. Native Qwik output keeps those, naming the `.qwik` context modules.
const designSystemReexport = /^export \* from '([^.'][^']*)';?\s*$/;
/**
 * Replaces the Solid flavoured JSX artifacts Panda emitted with Qwik ones. Panda's
 * framework-neutral files (`jsx/helper`, `jsx/is-valid-prop`, `jsx/factory.d.ts`) are kept.
 */
export function rewriteArtifacts(artifacts, options = {}) {
    const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
    const get = (id) => byId.get(id) ?? fail(`missing artifact "${id}"`);
    const factory = byId.get('jsx-factory');
    if (!factory || factory.files.length === 0) {
        fail("no JSX artifacts were generated; set `jsxFramework: 'qwik'` and keep this plugin in `plugins`");
    }
    const factoryFile = factory.files.find((file) => !isDts(file.path)) ?? fail('missing jsx/factory');
    const fromDesignSystem = designSystemReexport.test(factoryFile.code);
    if (!fromDesignSystem && !factoryFile.code.includes("from 'solid-js"))
        fail('jsx/factory is not the Solid flavour');
    const index = get('jsx-index');
    const indexModule = index.files.find((file) => !isDts(file.path)) ?? fail('missing jsx/index');
    const [, ext] = match(factoryFile.path, /(\.[mc]?[jt]s)$/, 'file extension', factoryFile.path);
    const format = {
        ext,
        ts: ext === '.ts',
        importExt: match(indexModule.code, /from '\.\/factory((?:\.[mc]?js)?)'/, 'factory export', indexModule.path)[1],
    };
    const indexTypes = index.files.find((file) => file.code.includes("from '../types/jsx")) ?? fail('missing the jsx/index type exports');
    const [, htmlProps, component, upper, variantProps] = match(indexTypes.code, /export (?:type )?\{ (\w+), (\w+), (\w+), (\w+), /, 'type exports', indexTypes.path);
    // A design system's factory is re-exported; the files that would need its name are re-exports too.
    const factoryName = fromDesignSystem
        ? ''
        : match(factoryFile.code, /export const (\w+)(?:: \w+)? = \/\* @__PURE__ \*\/ createJsxFactory\(\)/, 'factory name', factoryFile.path)[1];
    const names = { factory: factoryName, component, upper, htmlProps, variantProps };
    const mode = options.jsxStyleProps ?? 'all';
    const replace = (id, map) => {
        const artifact = get(id);
        artifact.files = artifact.files.map(map);
    };
    replace('jsx-factory', (file) => (isDts(file.path) || fromDesignSystem ? file : { ...file, code: factoryModule(names, format) }));
    const context = (file, dts, module) => {
        const reexport = designSystemReexport.exec(file.code);
        const code = reexport ? file.code.replace(reexport[1], `${reexport[1]}.qwik`) : isDts(file.path) ? dts : module;
        return { ...file, path: qwikPath(file.path), code };
    };
    replace('jsx-create-recipe-context', (file) => context(file, recipeContextDts(format), recipeContextModule(names, format)));
    replace('jsx-create-slot-recipe-context', (file) => context(file, slotRecipeContextDts(format), slotRecipeContextModule(names, mode, format)));
    replace('jsx-index', (file) => {
        const code = file.code.replace(/(\.\/create-(?:slot-)?recipe-context)((?:\.[mc]?js)?)'/g, "$1.qwik$2'");
        if (code === file.code)
            fail(`cannot find the recipe-context exports in ${file.path}`);
        return { ...file, code };
    });
    replace('jsx-patterns', (file) => {
        if (!isDts(file.path))
            return { ...file, code: patternModule(readPattern(file, format), format) };
        const code = file.code
            .replace("import type { Component } from 'solid-js';", "import type { FunctionComponent } from '@qwik.dev/core';")
            .replace(/(export declare const \w+): Component</, '$1: FunctionComponent<');
        if (code.includes('solid-js') || !code.includes(': FunctionComponent<'))
            fail(`cannot rewrite ${file.path}`);
        return { ...file, code };
    });
    replace('types', (file) => (/^types\/jsx\.(d\.)?[mc]?ts$/.test(file.path) ? { ...file, code: jsxTypes(names, format) } : file));
    return artifacts;
}
function readPattern(file, format) {
    const { code, path } = file;
    const [, jsxName] = match(code, /export const (\w+)(?:: Component<\w+>)? = \/\* @__PURE__ \*\/ function \1\(props/, 'component name', path);
    const [, rawName, fnPath] = match(code, /import \{ (\w+)Raw \} from '(\.\.\/patterns\/[^']+)';/, 'pattern import', path);
    const [, factory, factoryPath] = match(code, /import \{ (\w+) \} from '(\.\/factory[^']*)';/, 'factory import', path);
    const [, element] = match(code, /createComponent\(\w+\[("[^"]+")\]/, 'jsx element', path);
    const mergeCssPath = /import \{ mergeCss \} from '([^']+)';/.exec(code)?.[1];
    const mode = mergeCssPath ? 'minimal' : /return \{ css: styleProps \}/.test(code) ? 'none' : 'all';
    const pattern = { jsxName, fn: rawName, fnPath, factory, factoryPath, element, mode, mergeCssPath, propsName: '', propsInterface: '', typeImports: '' };
    if (format.ts) {
        pattern.typeImports = match(code, /import type \{ \w+Properties \} from [^\n]+\nimport type \{ \w+ \} from '\.\.\/types\/jsx[^\n]+\nimport type \{ DistributiveOmit \} from [^\n]+/, 'type imports', path)[0];
        const [propsInterface, propsName] = match(code, /export interface (\w+) extends [^\n]+/, 'props interface', path);
        Object.assign(pattern, { propsInterface, propsName });
    }
    return pattern;
}
