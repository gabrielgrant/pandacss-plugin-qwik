export type JsxStylePropsMode = 'all' | 'minimal' | 'none'

export interface ModuleFormat {
  /** Extension of emitted runtime files: `.js`, `.mjs` or `.ts`. */
  ext: string
  /** Suffix Panda appends to relative import specifiers (`forceImportExtension`), e.g. `''` or `.mjs`. */
  importExt: string
  /** `outExtension: 'ts'`: runtime files carry their own types and there are no `.d.ts` files. */
  ts: boolean
}

export interface TypeNames {
  factory: string
  component: string
  upper: string
  htmlProps: string
  variantProps: string
}

/**
 * Templates are TypeScript source with the type-only parts wrapped in «»: kept for
 * `outExtension: 'ts'`, removed for JavaScript, the same split Panda's codegen makes.
 */
export const render = (template: string, { ts }: ModuleFormat) =>
  ts ? template.replace(/[«»]/g, '') : template.replace(/«[^»]*»/g, '')
