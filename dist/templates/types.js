// Mirrors the Qwik JSX types of Panda's native codegen (crates/pandacss_codegen, jsx_types.rs).
export const jsxTypes = (n, { importExt: x }) => `import type { FunctionComponent, JSX, JSXChildren, JSXOutput, PropsOf } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeSelection, RecipeVariantRecord } from './recipe${x}';
import type { Assign, DistributiveUnion, JsxHTMLProps, JsxStyleProps, Pretty } from './system${x}';

export type ElementType = keyof JSX.IntrinsicElements | FunctionComponent<any>

export type ComponentProps<T extends ElementType> = T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : PropsOf<T>

export type ContextProviderComponent<T> = FunctionComponent<{ value: T; children?: JSXChildren }>

export interface RecipeContextOptions {
  /** Context id, needed when one recipe backs more than one context */
  id?: string | undefined
}

interface AnyProps {
  [k: string]: unknown
}

export type DataAttrs = Record<\`data-\${string}\`, unknown>

export interface UnstyledProps {
  unstyled?: boolean | undefined
}

export interface AsProps {
  as?: ElementType | undefined
}

export interface ${n.component}<T extends ElementType, P extends AnyProps = {}> {
  (props: JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<JsxStyleProps, P>>): JSXOutput
  displayName?: string
}

interface RuntimeRecipeFn {
  __type: any
}

export interface JsxFactoryOptions<TProps extends AnyProps, F extends string = string> {
  dataAttr?: boolean
  defaultProps?: Partial<TProps> & DataAttrs
  shouldForwardProp?: (prop: string, variantKeys: string[]) => boolean
  forwardProps?: readonly F[]
}

// Filters the few forwarded keys; a nested conditional here hits TS2590 on components with many props.
type ForwardedStyleKeys<T extends ElementType, F extends string> = Extract<Extract<F, keyof JsxStyleProps>, keyof ComponentProps<T>>

/** Props \`S\`, with each forwarded prop that shares a style prop's name typed from the component. */
export type WithForwardedProps<S, T extends ElementType, F extends string> = [ForwardedStyleKeys<T, F>] extends [never]
  ? S
  : Assign<S, Pick<ComponentProps<T>, ForwardedStyleKeys<T, F>>>

export type JsxRecipeProps<T extends ElementType, P extends AnyProps> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<JsxStyleProps, P>>

export type JsxElement<T extends ElementType, P extends AnyProps> = T extends ${n.component}<infer A, infer B>
  ? ${n.component}<A, Pretty<DistributiveUnion<P, B>>>
  : ${n.component}<T, P>

export interface JsxFactory {
  <T extends ElementType>(component: T): ${n.component}<T, {}>
  <T extends ElementType, P extends RecipeVariantRecord = {}, F extends string = never>(component: T, recipe: RecipeDefinition<P>, options?: JsxFactoryOptions<JsxRecipeProps<T, RecipeSelection<P>>, F>): JsxElement<T, WithForwardedProps<RecipeSelection<P>, T, F>>
  <T extends ElementType, P extends RuntimeRecipeFn, F extends string = never>(component: T, recipeFn: P, options?: JsxFactoryOptions<JsxRecipeProps<T, P["__type"]>, F>): JsxElement<T, WithForwardedProps<P["__type"], T, F>>
}

export type JsxElements = {
  [K in keyof JSX.IntrinsicElements]: ${n.component}<K, {}>
}

export type ${n.upper} = JsxFactory & JsxElements

export type ${n.htmlProps}<T extends ElementType> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, JsxStyleProps>

export type ${n.variantProps}<T extends ${n.component}<any, any>> = T extends ${n.component}<any, infer Props> ? Props : never`;
