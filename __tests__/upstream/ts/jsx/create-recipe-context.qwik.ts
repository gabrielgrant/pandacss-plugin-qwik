import { Slot, SkipRender, component$, createContextId, createSignal, isDev, jsx, noSerialize, untrack, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { styled } from './factory';
import { getDisplayName, mergeDefaultProps } from './helper';
import { toHash } from '../helpers';
import type { AsProps, ComponentProps, ContextProviderComponent, DataAttrs, ElementType, JsxFactoryOptions, RecipeContextOptions, UnstyledProps, WithForwardedProps } from '../types/jsx';
import type { FunctionComponent, JSXOutput, Signal } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeRuntimeFn, RecipeSelection, RecipeVariantRecord } from '../types/recipe';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system';

export type AnyRecipeDefinition = RecipeDefinition<RecipeVariantRecord>

export interface RuntimeRecipeFn {
  __type: unknown
  (props?: never): string
}

export type RecipeContextRecipe = RecipeRuntimeFn<any, any, any> | RuntimeRecipeFn | AnyRecipeDefinition

export type RecipePropsOf<R extends RecipeContextRecipe> = R extends RuntimeRecipeFn
  ? R['__type']
  : R extends RecipeRuntimeFn<infer P, any, any>
    ? P
    : R extends RecipeDefinition<infer T>
      ? RecipeSelection<T>
      : never

export type RecipeContextComponentProps<T extends ElementType, R extends RecipeContextRecipe, F extends string> = JsxHTMLProps<
  ComponentProps<T> & UnstyledProps & AsProps,
  WithForwardedProps<Assign<RecipePropsOf<R>, JsxStyleProps>, T, F>
>

export type RecipeContextComponent<T extends ElementType, R extends RecipeContextRecipe, F extends string = never> = (
  props: RecipeContextComponentProps<T, R, F>
) => JSXOutput

export interface RecipeContext<R extends RecipeContextRecipe> {
  withContext: <T extends ElementType, F extends string = never>(
    Component: T,
    options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined
  ) => RecipeContextComponent<T, R, F>
  PropsProvider: ContextProviderComponent<Partial<RecipePropsOf<R>> & DataAttrs>
  usePropsContext: () => RecipePropsOf<R> | undefined
}

type Props = Record<string, unknown>

interface PropsStore {
  value: Props | undefined
}

type StyledPart = (Component: ElementType, recipe: unknown, options?: unknown) => FunctionComponent<Props>

const styledPart = styled as unknown as StyledPart

const PropsHost: FunctionComponent<Props> = component$<Props>((props) => {
  const store = useStore<PropsStore>({ value: props.value as Props }, { deep: false })
  store.value = props.value as Props
  useContextProvider(createContextId<PropsStore>(props.__ctx as string), store)
  return jsx(Slot, {})
})

// Copying the props and the tick reads them here, so the component that renders this wrapper
// re-renders it when they change, instead of the change skipping the wrapper and its part.
function renderHost(Host: FunctionComponent<Props>, ctx: string, part: object | undefined, props: Props, defaultChildren: unknown): JSXOutput {
  const hostProps: Props = Object.assign({}, props)
  const tick = createSignal(0)
  hostProps.__seen = tick.value
  hostProps.children ??= defaultChildren
  return jsx(Host, Object.assign(hostProps, { __ctx: ctx, __part: part, __tick: tick }))
}

const contextSites = new Map<string, string | undefined>()

// Context ids must match between the server and a resumed client, so they come from the recipe, or
// from `options.id` when one recipe backs several contexts.
function contextId(prefix: string, recipe: object, name: string, options?: RecipeContextOptions): string {
  const { __name__, config } = recipe as { __name__?: string; config?: unknown }
  const key = options?.id ?? __name__ ?? toHash(JSON.stringify(config ?? recipe) ?? String(recipe))
  const id = `${prefix}-${key.replace(/[^\w.-]/g, '_')}`
  if (isDev && !options?.id) {
    const site = new Error().stack?.split('\n').slice(0, 4).join('\n').replace(/\?[^:)\s]*/g, '')
    if (contextSites.has(id) && contextSites.get(id) !== site) {
      console.warn(`${name} was called twice for the same recipe without an \`id\`, so both share one Qwik context. Pass a unique \`id\` option to each call. A hot reload that moves the call can also show this.`)
    }
    contextSites.set(id, site)
  }
  return id
}

type RecipeShape = Partial<Record<'__recipe__' | '__cva__' | 'base' | 'variants' | 'defaultVariants' | 'compoundVariants', unknown>>

interface RecipePart {
  Styled: FunctionComponent<Props>
}

function resolveRecipe(recipe: RecipeShape | null | undefined): RecipeShape {
  if (recipe == null) throw new Error('createRecipeContext requires a recipe')
  if (typeof recipe === 'function') return recipe
  if (recipe.base || recipe.variants || recipe.defaultVariants || recipe.compoundVariants) return recipe
  throw new Error('createRecipeContext requires a recipe')
}

const RecipeConsumer: FunctionComponent<Props> = component$<Props>((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId<PropsStore>(__ctx as string), null)?.value
  const part = __part as RecipePart | undefined
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => (__tick as Signal<number>).value++)
    return SkipRender
  }
  const mergedProps = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  return jsx(part.Styled, { ...mergedProps, children: jsx(Slot, {}) })
})

export function createRecipeContext<R extends RecipeContextRecipe>(recipeInput: R, options?: RecipeContextOptions): RecipeContext<R> {
  const recipe = resolveRecipe(recipeInput as RecipeShape)
  const ctx = contextId('panda-recipe', recipe, 'createRecipeContext', options)
  const usePropsContext = () => useContext(createContextId<PropsStore>(ctx), null)?.value

  const PropsProvider = (props: Props) => jsx(PropsHost, { value: props.value, children: props.children, __ctx: ctx })

  const withContext = (Component: ElementType, partOptions?: JsxFactoryOptions<Props>) => {
    const part = noSerialize<RecipePart>({ Styled: styledPart(Component, recipe, partOptions) })
    const WithContext = (props: Props) => renderHost(RecipeConsumer, ctx, part, props, partOptions?.defaultProps?.children)
    WithContext.displayName = `withContext(${getDisplayName(Component as Parameters<typeof getDisplayName>[0])})`
    return WithContext
  }

  return {
    withContext,
    PropsProvider,
    usePropsContext,
  } as unknown as RecipeContext<R>
}