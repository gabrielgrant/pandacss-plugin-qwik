import type { FunctionComponent, JSX, JSXChildren, JSXOutput, PropsOf } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeSelection, RecipeVariantRecord } from './recipe.mjs';
import type { Assign, DistributiveUnion, JsxHTMLProps, JsxStyleProps, Pretty } from './system.mjs';

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

export type DataAttrs = Record<`data-${string}`, unknown>

export interface UnstyledProps {
  unstyled?: boolean | undefined
}

export interface AsProps {
  as?: ElementType | undefined
}

export interface PandaComponent<T extends ElementType, P extends AnyProps = {}> {
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

/** Props `S`, with each forwarded prop that shares a style prop's name typed from the component. */
export type WithForwardedProps<S, T extends ElementType, F extends string> = [ForwardedStyleKeys<T, F>] extends [never]
  ? S
  : Assign<S, Pick<ComponentProps<T>, ForwardedStyleKeys<T, F>>>

export type JsxRecipeProps<T extends ElementType, P extends AnyProps> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<JsxStyleProps, P>>

export type JsxElement<T extends ElementType, P extends AnyProps> = T extends PandaComponent<infer A, infer B>
  ? PandaComponent<A, Pretty<DistributiveUnion<P, B>>>
  : PandaComponent<T, P>

export interface JsxFactory {
  <T extends ElementType>(component: T): PandaComponent<T, {}>
  <T extends ElementType, P extends RecipeVariantRecord = {}, F extends string = never>(component: T, recipe: RecipeDefinition<P>, options?: JsxFactoryOptions<JsxRecipeProps<T, RecipeSelection<P>>, F>): JsxElement<T, WithForwardedProps<RecipeSelection<P>, T, F>>
  <T extends ElementType, P extends RuntimeRecipeFn, F extends string = never>(component: T, recipeFn: P, options?: JsxFactoryOptions<JsxRecipeProps<T, P["__type"]>, F>): JsxElement<T, WithForwardedProps<P["__type"], T, F>>
}

export type JsxElements = {
  [K in keyof JSX.IntrinsicElements]: PandaComponent<K, {}>
}

export type Panda = JsxFactory & JsxElements

export type HTMLPandaProps<T extends ElementType> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, JsxStyleProps>

export type StyledVariantProps<T extends PandaComponent<any, any>> = T extends PandaComponent<any, infer Props> ? Props : never