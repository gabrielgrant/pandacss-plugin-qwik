import { render, type JsxStylePropsMode, type ModuleFormat } from './render.js'

export interface PatternInfo {
  jsxName: string
  /** The pattern function, e.g. `stack`, and its module. */
  fn: string
  fnPath: string
  factory: string
  factoryPath: string
  element: string
  mode: JsxStylePropsMode
  mergeCssPath: string | undefined
  /** TypeScript output only: the props interface and the type imports it needs. */
  propsName: string
  propsInterface: string
  typeImports: string
}

const mergedProps: Record<JsxStylePropsMode, string> = {
  all: '{ ...styleProps, ...restProps }',
  minimal: '{ ...restProps, css: mergeCss(styleProps, props.css) }',
  none: '{ ...restProps, css: styleProps }',
}

// Mirrors the Qwik pattern components of Panda's native codegen (react_pattern_jsx.rs).
export const patternModule = (p: PatternInfo, format: ModuleFormat) =>
  render(
    `import { jsx } from '@qwik.dev/core';
import { ${p.fn} } from '${p.fnPath}';
import { splitProps } from '../helpers${format.importExt}';
import { ${p.factory} } from '${p.factoryPath}';«
import type { FunctionComponent } from '@qwik.dev/core';
${p.typeImports}»${p.mergeCssPath ? `\nimport { mergeCss } from '${p.mergeCssPath}';` : ''}«

${p.propsInterface}»

export const ${p.jsxName}«: FunctionComponent<${p.propsName}>» = function ${p.jsxName}(props«: ${p.propsName}») {
  const [patternProps, restProps] = splitProps(props, ${p.fn}.propKeys)
  const styleProps = ${p.fn}.raw(patternProps)
  const mergedProps = ${mergedProps[p.mode]}
  return jsx(${p.factory}[${p.element}], mergedProps)
}`,
    format,
  )
