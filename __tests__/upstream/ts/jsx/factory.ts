import { isSignal, jsx } from '@qwik.dev/core';
import { cx, cva } from '../css/index';
import { composeCvaFn, composeShouldForwardProps, getDisplayName, serializeSplitStyles, mergeDefaultProps, splitJsxProps } from './helper';
import { isCssProperty } from './is-valid-prop';
import type { ClassList, FunctionComponent, JSXChildren, Signal } from '@qwik.dev/core';
import type { JsxRecipeFn, ShouldForwardProp, StyledMarkers } from './helper';
import type { RecipeDefinition } from '../types/recipe';
import type { ElementType, Styled } from '../types/jsx';

type Props = Record<string, unknown>

type StyledProps = {
  as?: ElementType
  unstyled?: boolean
  children?: JSXChildren
  class?: ClassList | Signal<ClassList>
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

type RecipeInput = JsxRecipeFn | Props

function toClassName(value: ClassList | Signal<ClassList> | undefined): string | undefined {
  if (isSignal(value)) return toClassName(value.value)
  if (!value || typeof value === 'string') return value || undefined
  if (Array.isArray(value)) return cx(...value.map(toClassName))
  return cx(...Object.keys(value).filter((key) => (value as Record<string, unknown>)[key]))
}

function styledFn(BaseComponent: StyledBase, recipeOrConfig: RecipeInput = {}, options: StyledOptions = {}): StyledComponentFn {
  const recipeFn = recipeOrConfig.__cva__ || recipeOrConfig.__recipe__ ? recipeOrConfig as JsxRecipeFn : cva(recipeOrConfig as RecipeDefinition) as unknown as JsxRecipeFn
  const composedRecipeFn = composeCvaFn(BaseComponent.__cva__, recipeFn)
  const getRaw = composedRecipeFn.__memoizedRaw__ || composedRecipeFn.raw
  const variantKeys = composedRecipeFn.variantKeys
  const variantSet = new Set(variantKeys)
  const forwardFn = options.shouldForwardProp || ((prop: string) => !variantSet.has(prop) && !isCssProperty(prop))
  const forwardProps = options.forwardProps
  const forwardPropSet = forwardProps?.length ? new Set(forwardProps) : void 0
  const shouldForwardProp = forwardPropSet
    ? (prop: string) => forwardPropSet.has(prop) || forwardFn(prop, variantKeys)
    : (prop: string) => forwardFn(prop, variantKeys)

  const dataProps: Props = options.dataAttr && recipeOrConfig.__name__ ? { 'data-recipe': recipeOrConfig.__name__ } : {}
  const defaultProps = Object.assign(dataProps, options.defaultProps)
  const hasDefaultProps = Object.keys(defaultProps).length > 0

  const shouldForward = composeShouldForwardProps(BaseComponent, shouldForwardProp)
  const DefaultElement: ElementType = BaseComponent.__base__ || BaseComponent

  const StyledComponent = function StyledComponent(props: StyledProps) {
    const Element = props.as === void 0 ? DefaultElement : props.as
    const unstyled = props.unstyled
    const children = props.children
    let combinedProps: StyledProps = props
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
      className = cx(hasStyles && serializeSplitStyles(propStyles, cssStyles), toClassName(combinedProps.class), combinedProps.className)
    } else if (recipeOrConfig.__recipe__) {
      const compoundVariantClasses = composedRecipeFn.__getCompoundVariantClasses__?.(variantProps)
      className = cx(
        composedRecipeFn(variantProps, false),
        compoundVariantClasses,
        hasStyles && serializeSplitStyles(propStyles, cssStyles),
        toClassName(combinedProps.class), combinedProps.className,
      )
    } else {
      className = cx(
        hasStyles ? serializeSplitStyles(propStyles, cssStyles, getRaw(variantProps)) : composedRecipeFn(variantProps),
        toClassName(combinedProps.class), combinedProps.className,
      )
    }

    return jsx(Element as string, {
      ...forwardedProps,
      ...elementProps,
      ...htmlProps,
      class: className,
      children: children ?? combinedProps.children,
    })
  } as StyledComponentFn

  const name = getDisplayName(DefaultElement as Parameters<typeof getDisplayName>[0])
  StyledComponent.displayName = `styled.${name}`
  StyledComponent.__cva__ = composedRecipeFn
  StyledComponent.__base__ = DefaultElement
  StyledComponent.__shouldForwardProps__ = shouldForwardProp

  return StyledComponent
}

function createJsxFactory(): Styled {
  const cache = new Map<PropertyKey, StyledComponentFn>()
  return new Proxy(styledFn, {
    apply(_, __, args) {
      return styledFn(...args as Parameters<typeof styledFn>)
    },
    get(_, el) {
      if (!cache.has(el)) cache.set(el, styledFn(el as StyledBase))
      return cache.get(el)
    },
  }) as unknown as Styled
}

export const styled: Styled = /* @__PURE__ */ createJsxFactory()