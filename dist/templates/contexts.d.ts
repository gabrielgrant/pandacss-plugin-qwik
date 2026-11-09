import type { JsxStylePropsMode, ModuleFormat, TypeNames } from './render.js';
export declare const recipeContextModule: (n: TypeNames, format: ModuleFormat) => string;
export declare const slotRecipeContextModule: (n: TypeNames, mode: JsxStylePropsMode, format: ModuleFormat) => string;
export declare const recipeContextDts: ({ importExt: x }: ModuleFormat) => string;
export declare const slotRecipeContextDts: ({ importExt: x }: ModuleFormat) => string;
