import type { JsxStylePropsMode, ModuleFormat, TypeNames } from './render.js'
import { render } from './render.js'

// Source text mirrors the Qwik output of Panda's native codegen (crates/pandacss_codegen,
// qwik_recipe_context.rs). Type-only spans are wrapped in «»; see render.ts.

const slotStyleProps: Record<JsxStylePropsMode, string> = {
  all: 'return { ...slotStyles« as SystemStyleObject», ...restProps }',
  minimal: 'return { ...restProps, css: css.raw(slotStyles« as SystemStyleObject», restProps.css« as SystemStyleObject») }',
  none: 'return { ...restProps, class: cx(css(slotStyles« as SystemStyleObject»), restProps.class« as string») }',
}

export const recipeContextModule = (n: TypeNames, format: ModuleFormat) => {
  const { importExt: x } = format
  return render(`import { Slot, SkipRender, component$, createContextId, createSignal, isDev, jsx, noSerialize, untrack, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { ${n.factory} } from './factory${x}';
import { getDisplayName, mergeDefaultProps } from './helper${x}';
import { toHash } from '../helpers${x}';«
import type { AsProps, ComponentProps, ContextProviderComponent, DataAttrs, ElementType, JsxFactoryOptions, RecipeContextOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { FunctionComponent, JSXOutput, Signal } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeRuntimeFn, RecipeSelection, RecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system${x}';

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

type StyledPart = (Component: ElementType, recipe: unknown, options?: unknown) => FunctionComponent<Props>»

const styledPart = ${n.factory}« as unknown as StyledPart»

const PropsHost«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const store = useStore«<PropsStore>»({ value: props.value« as Props» }, { deep: false })
  store.value = props.value« as Props»
  useContextProvider(createContextId«<PropsStore>»(props.__ctx« as string»), store)
  return jsx(Slot, {})
})

// Copying the props and the tick reads them here, so the component that renders this wrapper
// re-renders it when they change, instead of the change skipping the wrapper and its part.
function renderHost(Host«: FunctionComponent<Props>», ctx«: string», part«: object | undefined», props«: Props», defaultChildren«: unknown»)«: JSXOutput» {
  const hostProps«: Props» = Object.assign({}, props)
  const tick = createSignal(0)
  hostProps.__seen = tick.value
  hostProps.children ??= defaultChildren
  return jsx(Host, Object.assign(hostProps, { __ctx: ctx, __part: part, __tick: tick }))
}

const contextSites = new Map«<string, string | undefined>»()

// Context ids must match between the server and a resumed client, so they come from the recipe, or
// from \`options.id\` when one recipe backs several contexts.
function contextId(prefix«: string», recipe«: object», name«: string», options«?: RecipeContextOptions»)«: string» {
  const { __name__, config } = recipe« as { __name__?: string; config?: unknown }»
  const key = options?.id ?? __name__ ?? toHash(JSON.stringify(config ?? recipe) ?? String(recipe))
  const id = \`\${prefix}-\${key.replace(/[^\\w.-]/g, '_')}\`
  if (isDev && !options?.id) {
    const site = new Error().stack?.split('\\n').slice(0, 4).join('\\n').replace(/\\?[^:)\\s]*/g, '')
    if (contextSites.has(id) && contextSites.get(id) !== site) {
      console.warn(\`\${name} was called twice for the same recipe without an \\\`id\\\`, so both share one Qwik context. Pass a unique \\\`id\\\` option to each call. A hot reload that moves the call can also show this.\`)
    }
    contextSites.set(id, site)
  }
  return id
}

«type RecipeShape = Partial<Record<'__recipe__' | '__cva__' | 'base' | 'variants' | 'defaultVariants' | 'compoundVariants', unknown>>

interface RecipePart {
  Styled: FunctionComponent<Props>
}

»function resolveRecipe(recipe«: RecipeShape | null | undefined»)«: RecipeShape» {
  if (recipe == null) throw new Error('createRecipeContext requires a recipe')
  if (typeof recipe === 'function') return recipe
  if (recipe.base || recipe.variants || recipe.defaultVariants || recipe.compoundVariants) return recipe
  throw new Error('createRecipeContext requires a recipe')
}

const RecipeConsumer«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId«<PropsStore>»(__ctx« as string»), null)?.value
  const part = __part« as RecipePart | undefined»
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => «(»__tick« as Signal<number>)».value++)
    return SkipRender
  }
  const mergedProps = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  return jsx(part.Styled, { ...mergedProps, children: jsx(Slot, {}) })
})

export function createRecipeContext«<R extends RecipeContextRecipe>»(recipeInput«: R», options«?: RecipeContextOptions»)«: RecipeContext<R>» {
  const recipe = resolveRecipe(recipeInput« as RecipeShape»)
  const ctx = contextId('panda-recipe', recipe, 'createRecipeContext', options)
  const usePropsContext = () => useContext(createContextId«<PropsStore>»(ctx), null)?.value

  const PropsProvider = (props«: Props») => jsx(PropsHost, { value: props.value, children: props.children, __ctx: ctx })

  const withContext = (Component«: ElementType», partOptions«?: JsxFactoryOptions<Props>») => {
    const part = noSerialize«<RecipePart>»({ Styled: styledPart(Component, recipe, partOptions) })
    const WithContext = (props«: Props») => renderHost(RecipeConsumer, ctx, part, props, partOptions?.defaultProps?.children)
    WithContext.displayName = \`withContext(\${getDisplayName(Component« as Parameters<typeof getDisplayName>[0]»)})\`
    return WithContext
  }

  return {
    withContext,
    PropsProvider,
    usePropsContext,
  }« as unknown as RecipeContext<R>»
}`, format)
}

export const slotRecipeContextModule = (n: TypeNames, mode: JsxStylePropsMode, format: ModuleFormat) => {
  const { importExt: x } = format
  return render(`import { Slot, SkipRender, component$, createContextId, createSignal, isDev, jsx, noSerialize, untrack, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { ${n.factory} } from './factory${x}';
import { getDisplayName, mergeDefaultProps } from './helper${x}';
import { toHash } from '../helpers${x}';«
import type { AsProps, ComponentProps, ContextProviderComponent, DataAttrs, ElementType, JsxFactoryOptions, RecipeContextOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { FunctionComponent, JSXOutput, Signal } from '@qwik.dev/core';»
import { ${mode === 'all' ? 'cx, sva' : 'cx, css, sva'} } from '../css/index${x}';«
import type { RecipeSelection, SlotRecipeDefinition, SlotRecipeRuntimeFn, SlotRecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps, SystemStyleObject } from '../types/system${x}';

export type AnySlotRecipeDefinition = SlotRecipeDefinition<string, SlotRecipeVariantRecord<string>>

export interface RuntimeSlotRecipeFn {
  __type: unknown
  __slot: string
  (props?: never): unknown
}

export type SlotRecipeContextInput = SlotRecipeRuntimeFn<string, any, any, any> | RuntimeSlotRecipeFn | AnySlotRecipeDefinition

export type SlotNameOf<R extends SlotRecipeContextInput> = R extends RuntimeSlotRecipeFn
  ? R['__slot']
  : R extends SlotRecipeRuntimeFn<infer S, any, any, any>
    ? S
    : R extends SlotRecipeDefinition<infer S, any>
      ? S
      : string

export type SlotRecipePropsOf<R extends SlotRecipeContextInput> = R extends RuntimeSlotRecipeFn
  ? R['__type']
  : R extends SlotRecipeRuntimeFn<any, infer P, any, any>
    ? P
    : R extends SlotRecipeDefinition<any, infer T>
      ? RecipeSelection<T>
      : never

export interface WithProviderOptions<P = {}> {
  defaultProps?: (Partial<P> & DataAttrs) | undefined
}

export type SlotRecipeProviderProps<T extends ElementType, R extends SlotRecipeContextInput, F extends string> = JsxHTMLProps<
  ComponentProps<T> & UnstyledProps & AsProps,
  WithForwardedProps<Assign<SlotRecipePropsOf<R>, JsxStyleProps>, T, F>
>

export type SlotRecipeProviderComponent<T extends ElementType, R extends SlotRecipeContextInput, F extends string = never> = (
  props: SlotRecipeProviderProps<T, R, F>
) => JSXOutput

export type SlotRecipeRootProviderComponent<T extends ElementType, R extends SlotRecipeContextInput> = (
  props: ComponentProps<T> & UnstyledProps & SlotRecipePropsOf<R>
) => JSXOutput

export type SlotRecipeConsumerComponent<T extends ElementType, F extends string = never> = (
  props: JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, WithForwardedProps<JsxStyleProps, T, F>>
) => JSXOutput

export interface SlotRecipeContext<R extends SlotRecipeContextInput> {
  withRootProvider: <T extends ElementType>(
    Component: T,
    options?: WithProviderOptions<ComponentProps<T>> | undefined
  ) => SlotRecipeRootProviderComponent<T, R>
  withProvider: <T extends ElementType, F extends string = never>(
    Component: T,
    slot: SlotNameOf<R>,
    options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined
  ) => SlotRecipeProviderComponent<T, R, F>
  withContext: <T extends ElementType, F extends string = never>(
    Component: T,
    slot: SlotNameOf<R>,
    options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined
  ) => SlotRecipeConsumerComponent<T, F>
  PropsProvider: ContextProviderComponent<Partial<SlotRecipePropsOf<R>> & DataAttrs>
  usePropsContext: () => SlotRecipePropsOf<R> | undefined
}

type Props = Record<string, unknown>

interface PropsStore {
  value: Props | undefined
}

type StyledPart = (Component: ElementType, recipe: unknown, options?: unknown) => FunctionComponent<Props>»

const styledPart = ${n.factory}« as unknown as StyledPart»

const PropsHost«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const store = useStore«<PropsStore>»({ value: props.value« as Props» }, { deep: false })
  store.value = props.value« as Props»
  useContextProvider(createContextId«<PropsStore>»(props.__ctx« as string»), store)
  return jsx(Slot, {})
})

// Copying the props and the tick reads them here, so the component that renders this wrapper
// re-renders it when they change, instead of the change skipping the wrapper and its part.
function renderHost(Host«: FunctionComponent<Props>», ctx«: string», part«: object | undefined», props«: Props», defaultChildren«: unknown»)«: JSXOutput» {
  const hostProps«: Props» = Object.assign({}, props)
  const tick = createSignal(0)
  hostProps.__seen = tick.value
  hostProps.children ??= defaultChildren
  return jsx(Host, Object.assign(hostProps, { __ctx: ctx, __part: part, __tick: tick }))
}

const contextSites = new Map«<string, string | undefined>»()

// Context ids must match between the server and a resumed client, so they come from the recipe, or
// from \`options.id\` when one recipe backs several contexts.
function contextId(prefix«: string», recipe«: object», name«: string», options«?: RecipeContextOptions»)«: string» {
  const { __name__, config } = recipe« as { __name__?: string; config?: unknown }»
  const key = options?.id ?? __name__ ?? toHash(JSON.stringify(config ?? recipe) ?? String(recipe))
  const id = \`\${prefix}-\${key.replace(/[^\\w.-]/g, '_')}\`
  if (isDev && !options?.id) {
    const site = new Error().stack?.split('\\n').slice(0, 4).join('\\n').replace(/\\?[^:)\\s]*/g, '')
    if (contextSites.has(id) && contextSites.get(id) !== site) {
      console.warn(\`\${name} was called twice for the same recipe without an \\\`id\\\`, so both share one Qwik context. Pass a unique \\\`id\\\` option to each call. A hot reload that moves the call can also show this.\`)
    }
    contextSites.set(id, site)
  }
  return id
}

«type SlotStyles = Record<string, unknown> & { _classNameMap?: Record<string, string> }

interface SlotRecipeShape {
  splitVariantProps?: unknown
  slots?: unknown
  config?: AnySlotRecipeDefinition
  __recipe__?: unknown
  __name__?: string
}

interface SlotRecipeRuntime {
  (props?: Props): SlotStyles
  raw(props?: Props): SlotStyles
  splitVariantProps(props: Props): [Props, Props]
  classNameMap?: Record<string, string>
  __recipe__?: unknown
  __name__?: string
}

interface SlotOptions {
  defaultProps?: Props
  forwardProps?: readonly string[]
}

interface SlotPart {
  recipe: SlotRecipeRuntime
  Styled: FunctionComponent<Props>
  slot: string
  options?: SlotOptions | undefined
  missing?: string
}

interface SlotStore {
  slots: SlotStyles
}

»function resolveSlotRecipe(recipe«: SlotRecipeShape | null | undefined»)«: SlotRecipeShape» {
  if (recipe == null) throw new Error('createSlotRecipeContext requires a slot recipe')
  if (typeof recipe.splitVariantProps === 'function') return recipe
  if (recipe.slots) return recipe
  throw new Error('createSlotRecipeContext requires a slot recipe')
}

// Config recipes resolve each slot to a class string; \`sva\` resolves style objects.
const resolveProps = (props«: Props», slotStyles«: unknown»)«: Props» => {
  const { unstyled, ...restProps } = props
  if (unstyled) return restProps
  if (typeof slotStyles === 'string') return { ...restProps, class: cx(slotStyles, restProps.class« as string») }
  ${slotStyleProps[mode]}
}

const useSlotStyles = (ctx«: string», part«: SlotPart», props«: Props»)«: [SlotStyles, Props, Props]» => {
  const [variantProps, restProps] = part.recipe.splitVariantProps(props)
  const slots = part.recipe.__recipe__ !== undefined ? part.recipe(variantProps) : part.recipe.raw(variantProps)
  if (part.recipe.__recipe__ === undefined) slots._classNameMap = part.recipe.classNameMap
  const store = useStore«<SlotStore>»({ slots }, { deep: false })
  store.slots = slots
  useContextProvider(createContextId«<SlotStore>»(ctx), store)
  return [slots, variantProps, restProps]
}

const renderSlot = (part«: SlotPart», props«: Props», slots«: SlotStyles») =>
  jsx(part.Styled, {
    ...props,
    class: cx(props.class« as string», slots._classNameMap?.[part.slot]),
    'data-slot': part.slot,
    children: jsx(Slot, {}),
  })

const SlotRootProvider«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId«<PropsStore>»(\`\${__ctx}-props\`), null)?.value
  const part = __part« as SlotPart | undefined»
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => «(»__tick« as Signal<number>)».value++)
    return SkipRender
  }
  const merged = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  const [, , otherProps] = useSlotStyles(__ctx« as string», part, merged)
  const defaultProps = part.options?.defaultProps
  const mergedProps = defaultProps ? mergeDefaultProps(defaultProps, otherProps) : otherProps
  return jsx(part.Styled, { ...mergedProps, children: jsx(Slot, {}) })
})

const SlotProvider«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId«<PropsStore>»(\`\${__ctx}-props\`), null)?.value
  const part = __part« as SlotPart | undefined»
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => «(»__tick« as Signal<number>)».value++)
    return SkipRender
  }
  const merged = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  const [slots, variantProps, restProps] = useSlotStyles(__ctx« as string», part, merged)
  const defaultClass = part.options?.defaultProps?.class
  if (restProps.class == null && defaultClass) restProps.class = defaultClass
  const resolvedProps = resolveProps(restProps, slots[part.slot])
  part.options?.forwardProps?.forEach((key) => {
    if (key in variantProps) resolvedProps[key] = variantProps[key]
  })
  return renderSlot(part, resolvedProps, slots)
})

const SlotConsumer«: FunctionComponent<Props>» = component$«<Props>»((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const slots = useContext(createContextId«<SlotStore>»(__ctx« as string»), null)?.slots
  const part = __part« as SlotPart | undefined»
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => «(»__tick« as Signal<number>)».value++)
    return SkipRender
  }
  if (!slots) throw new Error(part.missing)
  const defaultClass = part.options?.defaultProps?.class
  const nextProps = ownProps.class == null && defaultClass ? { ...ownProps, class: defaultClass } : ownProps
  return renderSlot(part, resolveProps(nextProps, slots[part.slot]), slots)
})

export function createSlotRecipeContext«<R extends SlotRecipeContextInput>»(recipeInput«: R», options«?: RecipeContextOptions»)«: SlotRecipeContext<R>» {
  const recipe = resolveSlotRecipe(recipeInput« as SlotRecipeShape»)
  const isRuntimeRecipe = typeof recipe.splitVariantProps === 'function'
  const recipeName = isRuntimeRecipe && recipe.__name__ ? recipe.__name__ : undefined
  const contextName = recipeName ? \`createSlotRecipeContext("\${recipeName}")\` : 'createSlotRecipeContext'
  const slotRecipeFn = isRuntimeRecipe ? recipe «as SlotRecipeRuntime »: sva(recipe.config ?? recipe« as AnySlotRecipeDefinition»)« as unknown as SlotRecipeRuntime»
  const ctx = contextId('panda-slot-recipe', slotRecipeFn, contextName, options)
  const usePropsContext = () => useContext(createContextId«<PropsStore>»(\`\${ctx}-props\`), null)?.value

  const PropsProvider = (props«: Props») => jsx(PropsHost, { value: props.value, children: props.children, __ctx: \`\${ctx}-props\` })

  const withRootProvider = (Component«: ElementType», partOptions«?: SlotOptions») => {
    const part = noSerialize«<SlotPart>»({ recipe: slotRecipeFn, Styled: Component« as FunctionComponent<Props>», slot: '', options: partOptions })
    const WithRootProvider = (props«: Props») => renderHost(SlotRootProvider, ctx, part, props, partOptions?.defaultProps?.children)
    WithRootProvider.displayName = \`withRootProvider(\${getDisplayName(Component« as Parameters<typeof getDisplayName>[0]»)})\`
    return WithRootProvider
  }

  const withProvider = (Component«: ElementType», slot«: string», partOptions«?: SlotOptions») => {
    const Styled = styledPart(Component, {}, partOptions)
    const part = noSerialize«<SlotPart>»({ recipe: slotRecipeFn, Styled, slot, options: partOptions })
    const WithProvider = (props«: Props») => renderHost(SlotProvider, ctx, part, props, partOptions?.defaultProps?.children)
    WithProvider.displayName = \`withProvider(\${getDisplayName(Component« as Parameters<typeof getDisplayName>[0]»)})\`
    return WithProvider
  }

  const withContext = (Component«: ElementType», slot«: string», partOptions«?: SlotOptions») => {
    const componentName = getDisplayName(Component« as Parameters<typeof getDisplayName>[0]»)
    const missing = \`Component "\${componentName}" (slot: "\${slot}") cannot access \${contextName} because it's missing its Provider.\`
    const Styled = styledPart(Component, {}, partOptions)
    const part = noSerialize«<SlotPart>»({ recipe: slotRecipeFn, Styled, slot, options: partOptions, missing })
    const WithContext = (props«: Props») => renderHost(SlotConsumer, ctx, part, props, partOptions?.defaultProps?.children)
    WithContext.displayName = \`withContext(\${componentName})\`
    return WithContext
  }

  return {
    withRootProvider,
    withProvider,
    withContext,
    PropsProvider,
    usePropsContext,
  }« as unknown as SlotRecipeContext<R>»
}`, format)
}

export const recipeContextDts = ({ importExt: x }: ModuleFormat) => `import type { AsProps, ComponentProps, ContextProviderComponent, DataAttrs, ElementType, JsxFactoryOptions, RecipeContextOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { JSXOutput } from '@qwik.dev/core';
import type { RecipeDefinition, RecipeRuntimeFn, RecipeSelection, RecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system${x}';

export type AnyRecipeDefinition = RecipeDefinition<RecipeVariantRecord>;
export interface RuntimeRecipeFn {
  __type: unknown;
  (props?: never): string;
}
export type RecipeContextRecipe = RecipeRuntimeFn<any, any, any> | RuntimeRecipeFn | AnyRecipeDefinition;
export type RecipePropsOf<R extends RecipeContextRecipe> = R extends RuntimeRecipeFn ? R['__type'] : R extends RecipeRuntimeFn<infer P, any, any> ? P : R extends RecipeDefinition<infer T> ? RecipeSelection<T> : never;
export type RecipeContextComponentProps<
  T extends ElementType,
  R extends RecipeContextRecipe,
  F extends string
> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, WithForwardedProps<Assign<RecipePropsOf<R>, JsxStyleProps>, T, F>>;
export type RecipeContextComponent<
  T extends ElementType,
  R extends RecipeContextRecipe,
  F extends string = never
> = (props: RecipeContextComponentProps<T, R, F>) => JSXOutput;
export interface RecipeContext<R extends RecipeContextRecipe> {
  withContext: <
    T extends ElementType,
    F extends string = never
  >(Component: T, options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined) => RecipeContextComponent<T, R, F>;
  PropsProvider: ContextProviderComponent<Partial<RecipePropsOf<R>> & DataAttrs>;
  usePropsContext: () => RecipePropsOf<R> | undefined;
}
export declare function createRecipeContext<R extends RecipeContextRecipe>(recipeInput: R, options?: RecipeContextOptions): RecipeContext<R>;`

export const slotRecipeContextDts = ({ importExt: x }: ModuleFormat) => `import type { AsProps, ComponentProps, ContextProviderComponent, DataAttrs, ElementType, JsxFactoryOptions, RecipeContextOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { JSXOutput } from '@qwik.dev/core';
import type { RecipeSelection, SlotRecipeDefinition, SlotRecipeRuntimeFn, SlotRecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system${x}';

export type AnySlotRecipeDefinition = SlotRecipeDefinition<string, SlotRecipeVariantRecord<string>>;
export interface RuntimeSlotRecipeFn {
  __type: unknown;
  __slot: string;
  (props?: never): unknown;
}
export type SlotRecipeContextInput = SlotRecipeRuntimeFn<string, any, any, any> | RuntimeSlotRecipeFn | AnySlotRecipeDefinition;
export type SlotNameOf<R extends SlotRecipeContextInput> = R extends RuntimeSlotRecipeFn ? R['__slot'] : R extends SlotRecipeRuntimeFn<infer S, any, any, any> ? S : R extends SlotRecipeDefinition<infer S, any> ? S : string;
export type SlotRecipePropsOf<R extends SlotRecipeContextInput> = R extends RuntimeSlotRecipeFn ? R['__type'] : R extends SlotRecipeRuntimeFn<any, infer P, any, any> ? P : R extends SlotRecipeDefinition<any, infer T> ? RecipeSelection<T> : never;
export interface WithProviderOptions<P = {}> {
  defaultProps?: (Partial<P> & DataAttrs) | undefined;
}
export type SlotRecipeProviderProps<
  T extends ElementType,
  R extends SlotRecipeContextInput,
  F extends string
> = JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, WithForwardedProps<Assign<SlotRecipePropsOf<R>, JsxStyleProps>, T, F>>;
export type SlotRecipeProviderComponent<
  T extends ElementType,
  R extends SlotRecipeContextInput,
  F extends string = never
> = (props: SlotRecipeProviderProps<T, R, F>) => JSXOutput;
export type SlotRecipeRootProviderComponent<
  T extends ElementType,
  R extends SlotRecipeContextInput
> = (props: ComponentProps<T> & UnstyledProps & SlotRecipePropsOf<R>) => JSXOutput;
export type SlotRecipeConsumerComponent<
  T extends ElementType,
  F extends string = never
> = (props: JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, WithForwardedProps<JsxStyleProps, T, F>>) => JSXOutput;
export interface SlotRecipeContext<R extends SlotRecipeContextInput> {
  withRootProvider: <T extends ElementType>(Component: T, options?: WithProviderOptions<ComponentProps<T>> | undefined) => SlotRecipeRootProviderComponent<T, R>;
  withProvider: <
    T extends ElementType,
    F extends string = never
  >(Component: T, slot: SlotNameOf<R>, options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined) => SlotRecipeProviderComponent<T, R, F>;
  withContext: <
    T extends ElementType,
    F extends string = never
  >(Component: T, slot: SlotNameOf<R>, options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined) => SlotRecipeConsumerComponent<T, F>;
  PropsProvider: ContextProviderComponent<Partial<SlotRecipePropsOf<R>> & DataAttrs>;
  usePropsContext: () => SlotRecipePropsOf<R> | undefined;
}
export declare function createSlotRecipeContext<R extends SlotRecipeContextInput>(recipeInput: R, options?: RecipeContextOptions): SlotRecipeContext<R>;`
