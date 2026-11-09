import { render } from './render.js';
const mergedProps = {
    all: '{ ...styleProps, ...restProps }',
    minimal: '{ ...restProps, css: mergeCss(styleProps, props.css) }',
    none: '{ ...restProps, css: styleProps }',
};
// Mirrors the Qwik pattern components of Panda's native codegen (react_pattern_jsx.rs).
export const patternModule = (p, format) => render(`import { jsx } from '@qwik.dev/core';
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
}`, format);
