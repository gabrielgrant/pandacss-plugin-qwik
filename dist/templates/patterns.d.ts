import { type JsxStylePropsMode, type ModuleFormat } from './render.js';
export interface PatternInfo {
    jsxName: string;
    /** The pattern function, e.g. `stack`, and its module. */
    fn: string;
    fnPath: string;
    factory: string;
    factoryPath: string;
    element: string;
    mode: JsxStylePropsMode;
    mergeCssPath: string | undefined;
    /** TypeScript output only: the props interface and the type imports it needs. */
    propsName: string;
    propsInterface: string;
    typeImports: string;
}
export declare const patternModule: (p: PatternInfo, format: ModuleFormat) => string;
