import type { ModuleFormat } from '../rewrite.js'

export interface PatternInfo {
  jsxName: string
  rawName: string
  rawPath: string
  factoryName: string
  factoryPath: string
  keys: string
  element: string
  mode: 'all' | 'minimal' | 'none'
  mergeCssPath: string | undefined
}

const mergedProps: Record<PatternInfo['mode'], string> = {
  all: '{ ...styleProps, ...restProps }',
  minimal: '{ ...restProps, css: mergeCss(styleProps, props.css) }',
  none: '{ ...restProps, css: styleProps }',
}

export const patternModule = (p: PatternInfo, { importExt: x }: ModuleFormat) => `import { jsx } from '@qwik.dev/core';
import { splitProps } from '../helpers${x}';
import { ${p.rawName} } from '${p.rawPath}';
import { ${p.factoryName} } from '${p.factoryPath}';${p.mergeCssPath ? `\nimport { mergeCss } from '${p.mergeCssPath}';` : ''}

export const ${p.jsxName} = function ${p.jsxName}(props) {
  const [patternProps, restProps] = splitProps(props, ${p.keys})
  const styleProps = ${p.rawName}(patternProps)
  return jsx(${p.factoryName}[${p.element}], ${mergedProps[p.mode]})
}
`
