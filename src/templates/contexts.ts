import type { ModuleFormat } from '../rewrite.js'

/**
 * Qwik can only resume `component$` hosts whose props serialize, so the recipe function and
 * the factory options stay in the inline wrappers returned by `withProvider`/`withContext`/
 * `withRootProvider`/`PropsProvider`. The wrappers pass the hosts only serializable props:
 * the wrapped component (tag or `component$`), the context key, and the factory options with
 * `shouldForwardProp` evaluated into a record. The recipe travels as `noSerialize`: it is live
 * whenever the wrapper re-runs, and `PropsProvider` also stores it for re-renders it triggers.
 */
export const contextHostsModule = (factory: string, { importExt: x }: ModuleFormat) => `import { Slot, component$, createContextId, jsx, noSerialize, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { cx } from '../css/index${x}';
import { ${factory} } from './factory${x}';
import { mergeDefaultProps } from './helper${x}';
import { isCssProperty } from './is-valid-prop${x}';

const NOT_FOUND = { __pandaContextNotFound: true }
// detected by marker, not identity: Qwik serializes the useContext default
const isFound = (value) => value != null && !(typeof value === 'object' && '__pandaContextNotFound' in value)

const mergeClass = (...parts) => (parts.some((part) => part && typeof part !== 'string') ? parts : cx(...parts))

const hash = (value) => {
  let h = 5381
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// context ids must be stable across server and client, and Qwik only allows [A-Za-z0-9_.-]
export const contextKey = (kind, recipe) => {
  const name = recipe.__name__ ?? \`anonymous-\${hash(JSON.stringify(recipe.config ?? recipe) ?? '')}\`
  return \`panda.\${kind}.\${String(name).replace(/[^A-Za-z0-9_.-]/g, '_')}\`
}

export const recipeProp = (recipe) => (typeof recipe === 'function' ? noSerialize(recipe) : recipe)

export const factoryOptions = (options, props, variantKeys) => {
  const { children, ...defaultProps } = options?.defaultProps ?? {}
  let forward
  if (options?.shouldForwardProp) {
    forward = {}
    for (const key of Object.keys({ ...defaultProps, ...props })) forward[key] = !!options.shouldForwardProp(key, variantKeys)
  }
  return { dataAttr: options?.dataAttr, defaultProps, forwardProps: options?.forwardProps, forward }
}

const toStyled = (Component, recipe, { forward, ...options }) =>
  ${factory}(
    Component,
    recipe,
    forward ? { ...options, shouldForwardProp: (prop, keys) => forward[prop] ?? (!keys.includes(prop) && !isCssProperty(prop)) } : options,
  )

const usePropsStore = (key) => {
  const store = useContext(createContextId(\`\${key}.props\`), NOT_FOUND)
  return isFound(store) ? store : undefined
}

export const usePropsValue = (key) => usePropsStore(key)?.value

const useRecipeProps = (key, recipe, props) => {
  const store = usePropsStore(key)
  const resolved = recipe ?? store?.recipe
  if (!resolved) throw new Error(\`pandacss-plugin-qwik: the recipe for "\${key}" is not available on this render\`)
  return [resolved, store?.value ? mergeDefaultProps(store.value, props) : props]
}

const isConfigRecipe = (recipe) => recipe.__recipe__ !== undefined

const resolveSlots = (recipe, variantProps) => {
  const styles = isConfigRecipe(recipe) ? recipe(variantProps) : recipe.raw(variantProps)
  if (!isConfigRecipe(recipe)) styles._classNameMap = recipe.classNameMap
  return styles
}

const useSlotsProvider = (key, slots) => {
  const store = useStore({ slots }, { deep: false })
  store.slots = slots
  useContextProvider(createContextId(\`\${key}.styles\`), store)
}

const resolveProps = (isConfig, props, slotStyles) => {
  const { unstyled, ...restProps } = props
  if (unstyled) return restProps
  if (isConfig) return { ...restProps, class: mergeClass(slotStyles, restProps.class) }
  return { ...slotStyles, ...restProps }
}

const renderSlot = (Component, slot, opts, slots, resolvedProps) =>
  jsx(toStyled(Component, {}, opts), {
    ...resolvedProps,
    class: mergeClass(resolvedProps.class, slots._classNameMap?.[slot]),
    'data-slot': slot,
    children: jsx(Slot, {}),
  })

export const PropsProviderHost = component$((props) => {
  const store = useStore({ value: props.value, recipe: props.__recipe }, { deep: false })
  store.value = props.value
  if (props.__recipe) store.recipe = props.__recipe
  useContextProvider(createContextId(\`\${props.__key}.props\`), store)
  return jsx(Slot, {})
})

export const SlotRootProviderHost = component$((props) => {
  const { __key, __cmp, __recipe, __defaults, ...rest } = props
  const [recipe, inProps] = useRecipeProps(__key, __recipe, rest)
  const [variantProps, otherProps] = recipe.splitVariantProps(inProps)
  useSlotsProvider(__key, resolveSlots(recipe, variantProps))
  return jsx(__cmp, { ...mergeDefaultProps(__defaults, otherProps), children: jsx(Slot, {}) })
})

export const SlotProviderHost = component$((props) => {
  const { __key, __slot, __cmp, __recipe, __opts, ...rest } = props
  const [recipe, inProps] = useRecipeProps(__key, __recipe, rest)
  const [variantProps, restProps] = recipe.splitVariantProps(inProps)
  const slots = resolveSlots(recipe, variantProps)
  useSlotsProvider(__key, slots)
  if (restProps.class == null && __opts.defaultProps.class) restProps.class = __opts.defaultProps.class
  const resolvedProps = resolveProps(isConfigRecipe(recipe), restProps, slots[__slot])
  __opts.forwardProps?.forEach((key) => {
    if (key in variantProps) resolvedProps[key] = variantProps[key]
  })
  return renderSlot(__cmp, __slot, __opts, slots, resolvedProps)
})

export const SlotConsumerHost = component$((props) => {
  const { __key, __slot, __cmp, __config, __label, __name, __opts, ...rest } = props
  const store = useContext(createContextId(\`\${__key}.styles\`), NOT_FOUND)
  if (!isFound(store)) {
    const componentInfo = __name ? \`Component "\${__name}"\` : 'A component'
    throw new Error(\`\${componentInfo} (slot: "\${__slot}") cannot access \${__label} because it's missing its Provider.\`)
  }
  const slots = store.slots
  const nextProps = rest.class == null && __opts.defaultProps.class ? { ...rest, class: __opts.defaultProps.class } : rest
  return renderSlot(__cmp, __slot, __opts, slots, resolveProps(__config, nextProps, slots[__slot]))
})

export const RecipeContextHost = component$((props) => {
  const { __key, __cmp, __recipe, __opts, ...rest } = props
  const [recipe, inProps] = useRecipeProps(__key, __recipe, rest)
  return jsx(toStyled(__cmp, recipe, __opts), { ...inProps, children: jsx(Slot, {}) })
})
`

export const slotRecipeContextModule = ({ importExt: x }: ModuleFormat) => `import { jsx } from '@qwik.dev/core';
import { sva } from '../css/index${x}';
import { getDisplayName } from './helper${x}';
import { PropsProviderHost, SlotConsumerHost, SlotProviderHost, SlotRootProviderHost, contextKey, factoryOptions, recipeProp, usePropsValue } from './context-hosts.qwik${x}';

function resolveSlotRecipe(recipe) {
  if (recipe == null) throw new Error('createSlotRecipeContext requires a slot recipe')
  if (typeof recipe.splitVariantProps === 'function') return recipe
  if (recipe.slots) return recipe
  throw new Error('createSlotRecipeContext requires a slot recipe')
}

export function createSlotRecipeContext(recipeInput) {
  const recipe = resolveSlotRecipe(recipeInput)
  const isRuntimeRecipe = typeof recipe.splitVariantProps === 'function'
  const isConfigRecipe = isRuntimeRecipe && recipe.__recipe__ !== undefined
  const recipeName = isRuntimeRecipe && recipe.__name__ ? recipe.__name__ : undefined
  const contextName = recipeName ? \`createSlotRecipeContext("\${recipeName}")\` : 'createSlotRecipeContext'
  const slotRecipeFn = isRuntimeRecipe ? recipe : sva(recipe.config ?? recipe)
  const key = contextKey('slot', slotRecipeFn)
  const __recipe = recipeProp(slotRecipeFn)

  const withRootProvider = (Component, options) => {
    const { children: defaultChildren, ...defaults } = options?.defaultProps ?? {}
    const WithRootProvider = ({ children, ...props }) =>
      jsx(SlotRootProviderHost, { ...props, __key: key, __cmp: Component, __recipe, __defaults: defaults, children: children ?? defaultChildren })
    WithRootProvider.displayName = \`withRootProvider(\${getDisplayName(Component)})\`
    return WithRootProvider
  }

  const withProvider = (Component, slot, options) => {
    const WithProvider = ({ children, ...props }) =>
      jsx(SlotProviderHost, {
        ...props,
        __key: key,
        __slot: slot,
        __cmp: Component,
        __recipe,
        __opts: factoryOptions(options, props, []),
        children: children ?? options?.defaultProps?.children,
      })
    WithProvider.displayName = \`withProvider(\${getDisplayName(Component)})\`
    return WithProvider
  }

  const withContext = (Component, slot, options) => {
    const componentName = getDisplayName(Component)
    const WithContext = ({ children, ...props }) =>
      jsx(SlotConsumerHost, {
        ...props,
        __key: key,
        __slot: slot,
        __cmp: Component,
        __config: isConfigRecipe,
        __label: contextName,
        __name: componentName,
        __opts: factoryOptions(options, props, []),
        children: children ?? options?.defaultProps?.children,
      })
    WithContext.displayName = \`withContext(\${componentName})\`
    return WithContext
  }

  const PropsProvider = ({ value, children }) => jsx(PropsProviderHost, { __key: key, __recipe, value, children })

  return {
    withRootProvider,
    withProvider,
    withContext,
    PropsProvider,
    usePropsContext: () => usePropsValue(key),
  }
}
`

export const recipeContextModule = ({ importExt: x }: ModuleFormat) => `import { jsx } from '@qwik.dev/core';
import { cva } from '../css/index${x}';
import { getDisplayName } from './helper${x}';
import { PropsProviderHost, RecipeContextHost, contextKey, factoryOptions, recipeProp, usePropsValue } from './context-hosts.qwik${x}';

function resolveRecipe(recipe) {
  if (recipe == null) throw new Error('createRecipeContext requires a recipe')
  if (recipe.__recipe__ === true || recipe.__cva__ === true) return recipe
  if (recipe.base || recipe.variants || recipe.defaultVariants || recipe.compoundVariants) return recipe
  throw new Error('createRecipeContext requires a recipe')
}

export function createRecipeContext(recipeInput) {
  const recipe = resolveRecipe(recipeInput)
  const key = contextKey('recipe', recipe)
  const __recipe = recipeProp(recipe)
  const variantKeys = (recipe.__cva__ || recipe.__recipe__ ? recipe : cva(recipe)).variantKeys

  const withContext = (Component, options) => {
    const WithContext = ({ children, ...props }) =>
      jsx(RecipeContextHost, {
        ...props,
        __key: key,
        __cmp: Component,
        __recipe,
        __opts: factoryOptions(options, props, variantKeys),
        children: children ?? options?.defaultProps?.children,
      })
    WithContext.displayName = \`withContext(\${getDisplayName(Component)})\`
    return WithContext
  }

  const PropsProvider = ({ value, children }) => jsx(PropsProviderHost, { __key: key, __recipe, value, children })

  return {
    withContext,
    PropsProvider,
    usePropsContext: () => usePropsValue(key),
  }
}
`

const qwikNote = `/**
 * Qwik: call this at module top level. The wrapped \`Component\` must be a tag name or a
 * \`component$\`, since it is passed to a resumable host. \`usePropsContext\` is a hook.
 */`

export const slotRecipeContextDts = ({ importExt: x }: ModuleFormat) => `import type { RecipeSelection, SlotRecipeDefinition, SlotRecipeRuntimeFn, SlotRecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system${x}';
import type { AsProps, ComponentProps, DataAttrs, ElementType, JsxFactoryOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { Component, JSXChildren } from '@qwik.dev/core';

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
> = Component<SlotRecipeProviderProps<T, R, F>>;
export type SlotRecipeRootProviderComponent<
  T extends ElementType,
  R extends SlotRecipeContextInput
> = Component<ComponentProps<T> & UnstyledProps & SlotRecipePropsOf<R>>;
export type SlotRecipeConsumerComponent<
  T extends ElementType,
  F extends string = never
> = Component<JsxHTMLProps<ComponentProps<T> & UnstyledProps & AsProps, WithForwardedProps<JsxStyleProps, T, F>>>;
export type PropsProviderComponent<T> = Component<{ value: T; children?: JSXChildren }>;
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
  PropsProvider: PropsProviderComponent<Partial<SlotRecipePropsOf<R>> & DataAttrs>;
  usePropsContext: () => SlotRecipePropsOf<R> | undefined;
}
${qwikNote}
export declare function createSlotRecipeContext<R extends SlotRecipeContextInput>(recipeInput: R): SlotRecipeContext<R>;
`

export const recipeContextDts = ({ importExt: x }: ModuleFormat) => `import type { RecipeDefinition, RecipeRuntimeFn, RecipeSelection, RecipeVariantRecord } from '../types/recipe${x}';
import type { Assign, JsxHTMLProps, JsxStyleProps } from '../types/system${x}';
import type { AsProps, ComponentProps, DataAttrs, ElementType, JsxFactoryOptions, UnstyledProps, WithForwardedProps } from '../types/jsx${x}';
import type { Component, JSXChildren } from '@qwik.dev/core';

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
> = Component<RecipeContextComponentProps<T, R, F>>;
export interface RecipeContext<R extends RecipeContextRecipe> {
  withContext: <
    T extends ElementType,
    F extends string = never
  >(Component: T, options?: JsxFactoryOptions<ComponentProps<T>, F> | undefined) => RecipeContextComponent<T, R, F>;
  PropsProvider: Component<{ value: Partial<RecipePropsOf<R>> & DataAttrs; children?: JSXChildren }>;
  usePropsContext: () => RecipePropsOf<R> | undefined;
}
${qwikNote}
export declare function createRecipeContext<R extends RecipeContextRecipe>(recipeInput: R): RecipeContext<R>;
`
