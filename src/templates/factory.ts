import type { ModuleFormat, TypeNames } from './render.js'
import { render } from './render.js'

// Mirrors the Qwik factory of Panda's native codegen (crates/pandacss_codegen, qwik_jsx.rs).
export const factoryModule = (n: TypeNames, format: ModuleFormat) => {
  const { importExt: x } = format
  return render(`import { jsx } from '@qwik.dev/core';
import { cx, cva } from '../css/index${x}';
import { composeCvaFn, composeShouldForwardProps, getDisplayName, serializeSplitStyles, mergeDefaultProps, splitJsxProps } from './helper${x}';
import { isCssProperty } from './is-valid-prop${x}';«
import type { FunctionComponent, JSXChildren } from '@qwik.dev/core';
import type { JsxRecipeFn, ShouldForwardProp, StyledMarkers } from './helper${x}';
import type { RecipeDefinition } from '../types/recipe${x}';
import type { ElementType, ${n.upper} } from '../types/jsx${x}';

type Props = Record<string, unknown>

type StyledProps = {
  as?: ElementType
  unstyled?: boolean
  children?: JSXChildren
  class?: string
  className?: string
}

interface StyledOptions {
  shouldForwardProp?: ShouldForwardProp
  forwardProps?: readonly string[]
  dataAttr?: boolean
  defaultProps?: Props
}

type StyledBase = ElementType & StyledMarkers & { __base__?: ElementType }

type StyledComponentFn = FunctionComponent<StyledProps> & StyledMarkers & { displayName?: string }

type RecipeInput = JsxRecipeFn | Props»

function styledFn(BaseComponent«: StyledBase», recipeOrConfig«: RecipeInput» = {}, options«: StyledOptions» = {})«: StyledComponentFn» {
  const recipeFn = recipeOrConfig.__cva__ || recipeOrConfig.__recipe__ ? recipeOrConfig «as JsxRecipeFn »: cva(recipeOrConfig« as RecipeDefinition»)« as unknown as JsxRecipeFn»
  const composedRecipeFn = composeCvaFn(BaseComponent.__cva__, recipeFn)
  const getRaw = composedRecipeFn.__memoizedRaw__ || composedRecipeFn.raw
  const variantKeys = composedRecipeFn.variantKeys
  const variantSet = new Set(variantKeys)
  const forwardFn = options.shouldForwardProp || ((prop«: string») => !variantSet.has(prop) && !isCssProperty(prop))
  const forwardProps = options.forwardProps
  const forwardPropSet = forwardProps?.length ? new Set(forwardProps) : void 0
  const shouldForwardProp = forwardPropSet
    ? (prop«: string») => forwardPropSet.has(prop) || forwardFn(prop, variantKeys)
    : (prop«: string») => forwardFn(prop, variantKeys)

  const dataProps«: Props» = options.dataAttr && recipeOrConfig.__name__ ? { 'data-recipe': recipeOrConfig.__name__ } : {}
  const defaultProps = Object.assign(dataProps, options.defaultProps)
  const hasDefaultProps = Object.keys(defaultProps).length > 0

  const shouldForward = composeShouldForwardProps(BaseComponent, shouldForwardProp)
  const DefaultElement«: ElementType» = BaseComponent.__base__ || BaseComponent

  const ${n.component} = function ${n.component}(props«: StyledProps») {
    const Element = props.as === void 0 ? DefaultElement : props.as
    const unstyled = props.unstyled
    const children = props.children
    let combinedProps«: StyledProps» = props
    if (hasDefaultProps) {
      const { as, unstyled, children, ...restProps } = props
      combinedProps = mergeDefaultProps(defaultProps, restProps)
    }
    const [htmlProps, forwardedProps, variantProps, propStyles, cssStyles, elementProps] = splitJsxProps(
      combinedProps,
      shouldForward,
      variantSet,
      isCssProperty,
      true,
    )
    const hasStyles = propStyles || cssStyles !== void 0
    let className
    if (unstyled) {
      className = cx(hasStyles && serializeSplitStyles(propStyles, cssStyles), combinedProps.class, combinedProps.className)
    } else if (recipeOrConfig.__recipe__) {
      const compoundVariantClasses = composedRecipeFn.__getCompoundVariantClasses__?.(variantProps)
      className = cx(
        composedRecipeFn(variantProps, false),
        compoundVariantClasses,
        hasStyles && serializeSplitStyles(propStyles, cssStyles),
        combinedProps.class, combinedProps.className,
      )
    } else {
      className = cx(
        hasStyles ? serializeSplitStyles(propStyles, cssStyles, getRaw(variantProps)) : composedRecipeFn(variantProps),
        combinedProps.class, combinedProps.className,
      )
    }

    return jsx(Element« as string», {
      ...forwardedProps,
      ...elementProps,
      ...htmlProps,
      class: className,
      children: children ?? combinedProps.children,
    })
  }« as StyledComponentFn»

  const name = getDisplayName(DefaultElement« as Parameters<typeof getDisplayName>[0]»)
  ${n.component}.displayName = \`${n.factory}.\${name}\`
  ${n.component}.__cva__ = composedRecipeFn
  ${n.component}.__base__ = DefaultElement
  ${n.component}.__shouldForwardProps__ = shouldForwardProp

  return ${n.component}
}

function createJsxFactory()«: ${n.upper}» {
  const cache = new Map«<PropertyKey, StyledComponentFn>»()
  return new Proxy(styledFn, {
    apply(_, __, args) {
      return styledFn(...args« as Parameters<typeof styledFn>»)
    },
    get(_, el) {
      if (!cache.has(el)) cache.set(el, styledFn(el« as StyledBase»))
      return cache.get(el)
    },
  })« as unknown as ${n.upper}»
}

export const ${n.factory}«: ${n.upper}» = /* @__PURE__ */ createJsxFactory()`, format)
}
