import type { Component, FunctionComponent, PropsOf, QwikIntrinsicElements } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeSelection, RecipeVariantRecord } from './recipe';
import type { Assign, DistributiveUnion, JsxHTMLProps, JsxStyleProps, Pretty } from './system';

export type ElementType = keyof QwikIntrinsicElements | Component<any> | FunctionComponent<any>

export type ComponentProps<T extends ElementType> = PropsOf<T>

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

export type StyledComponentProps<T extends ElementType, P extends AnyProps = {}> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<JsxStyleProps, P>>

export interface StyledComponent<T extends ElementType, P extends AnyProps = {}> extends Component<StyledComponentProps<T, P>> {
  displayName?: string | undefined
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

type ForwardedStyleKeys<T extends ElementType, F extends string> = Extract<Extract<F, keyof JsxStyleProps>, keyof ComponentProps<T>>

export type WithForwardedProps<S, T extends ElementType, F extends string> = [ForwardedStyleKeys<T, F>] extends [never]
  ? S
  : Assign<S, Pick<ComponentProps<T>, ForwardedStyleKeys<T, F>>>

export type JsxRecipeProps<T extends ElementType, P extends AnyProps> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, Assign<JsxStyleProps, P>>

export type JsxElement<T extends ElementType, P extends AnyProps> = T extends StyledComponent<infer A, infer B>
  ? StyledComponent<A, Pretty<DistributiveUnion<P, B>>>
  : StyledComponent<T, P>

export interface JsxFactory {
  <T extends ElementType>(component: T): StyledComponent<T, {}>
  <T extends ElementType, P extends RecipeVariantRecord = {}, F extends string = never>(component: T, recipe: RecipeDefinition<P>, options?: JsxFactoryOptions<JsxRecipeProps<T, RecipeSelection<P>>, F>): JsxElement<T, WithForwardedProps<RecipeSelection<P>, T, F>>
  <T extends ElementType, P extends RuntimeRecipeFn, F extends string = never>(component: T, recipeFn: P, options?: JsxFactoryOptions<JsxRecipeProps<T, P["__type"]>, F>): JsxElement<T, WithForwardedProps<P["__type"], T, F>>
}

export type JsxElements = {
  [K in keyof QwikIntrinsicElements]: StyledComponent<K, {}>
}

export type Styled = JsxFactory & JsxElements

export type HTMLStyledProps<T extends ElementType> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, JsxStyleProps>

export type StyledVariantProps<T extends StyledComponent<any, any>> = T extends StyledComponent<any, infer Props> ? Props : never
