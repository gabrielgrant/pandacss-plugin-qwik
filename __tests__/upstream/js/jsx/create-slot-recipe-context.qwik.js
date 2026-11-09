import { Slot, SkipRender, component$, createContextId, createSignal, isDev, jsx, noSerialize, untrack, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { styled } from './factory';
import { getDisplayName, mergeDefaultProps } from './helper';
import { toHash } from '../helpers';
import { cx, sva } from '../css/index';

const styledPart = styled

const PropsHost = component$((props) => {
  const store = useStore({ value: props.value }, { deep: false })
  store.value = props.value
  useContextProvider(createContextId(props.__ctx), store)
  return jsx(Slot, {})
})

// Copying the props and the tick reads them here, so the component that renders this wrapper
// re-renders it when they change, instead of the change skipping the wrapper and its part.
function renderHost(Host, ctx, part, props, defaultChildren) {
  const hostProps = Object.assign({}, props)
  const tick = createSignal(0)
  hostProps.__seen = tick.value
  hostProps.children ??= defaultChildren
  return jsx(Host, Object.assign(hostProps, { __ctx: ctx, __part: part, __tick: tick }))
}

const contextSites = new Map()

// Context ids must match between the server and a resumed client, so they come from the recipe, or
// from `options.id` when one recipe backs several contexts.
function contextId(prefix, recipe, name, options) {
  const { __name__, config } = recipe
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

function resolveSlotRecipe(recipe) {
  if (recipe == null) throw new Error('createSlotRecipeContext requires a slot recipe')
  if (typeof recipe.splitVariantProps === 'function') return recipe
  if (recipe.slots) return recipe
  throw new Error('createSlotRecipeContext requires a slot recipe')
}

// Config recipes resolve each slot to a class string; `sva` resolves style objects.
const resolveProps = (props, slotStyles) => {
  const { unstyled, ...restProps } = props
  if (unstyled) return restProps
  if (typeof slotStyles === 'string') return { ...restProps, class: cx(slotStyles, restProps.class) }
  return { ...slotStyles, ...restProps }
}

const useSlotStyles = (ctx, part, props) => {
  const [variantProps, restProps] = part.recipe.splitVariantProps(props)
  const slots = part.recipe.__recipe__ !== undefined ? part.recipe(variantProps) : part.recipe.raw(variantProps)
  if (part.recipe.__recipe__ === undefined) slots._classNameMap = part.recipe.classNameMap
  const store = useStore({ slots }, { deep: false })
  store.slots = slots
  useContextProvider(createContextId(ctx), store)
  return [slots, variantProps, restProps]
}

const renderSlot = (part, props, slots) =>
  jsx(part.Styled, {
    ...props,
    class: cx(props.class, slots._classNameMap?.[part.slot]),
    'data-slot': part.slot,
    children: jsx(Slot, {}),
  })

const SlotRootProvider = component$((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId(`${__ctx}-props`), null)?.value
  const part = __part
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => __tick.value++)
    return SkipRender
  }
  const merged = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  const [, , otherProps] = useSlotStyles(__ctx, part, merged)
  const defaultProps = part.options?.defaultProps
  const mergedProps = defaultProps ? mergeDefaultProps(defaultProps, otherProps) : otherProps
  return jsx(part.Styled, { ...mergedProps, children: jsx(Slot, {}) })
})

const SlotProvider = component$((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId(`${__ctx}-props`), null)?.value
  const part = __part
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => __tick.value++)
    return SkipRender
  }
  const merged = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  const [slots, variantProps, restProps] = useSlotStyles(__ctx, part, merged)
  const defaultClass = part.options?.defaultProps?.class
  if (restProps.class == null && defaultClass) restProps.class = defaultClass
  const resolvedProps = resolveProps(restProps, slots[part.slot])
  part.options?.forwardProps?.forEach((key) => {
    if (key in variantProps) resolvedProps[key] = variantProps[key]
  })
  return renderSlot(part, resolvedProps, slots)
})

const SlotConsumer = component$((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const slots = useContext(createContextId(__ctx), null)?.slots
  const part = __part
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => __tick.value++)
    return SkipRender
  }
  if (!slots) throw new Error(part.missing)
  const defaultClass = part.options?.defaultProps?.class
  const nextProps = ownProps.class == null && defaultClass ? { ...ownProps, class: defaultClass } : ownProps
  return renderSlot(part, resolveProps(nextProps, slots[part.slot]), slots)
})

export function createSlotRecipeContext(recipeInput, options) {
  const recipe = resolveSlotRecipe(recipeInput)
  const isRuntimeRecipe = typeof recipe.splitVariantProps === 'function'
  const recipeName = isRuntimeRecipe && recipe.__name__ ? recipe.__name__ : undefined
  const contextName = recipeName ? `createSlotRecipeContext("${recipeName}")` : 'createSlotRecipeContext'
  const slotRecipeFn = isRuntimeRecipe ? recipe : sva(recipe.config ?? recipe)
  const ctx = contextId('panda-slot-recipe', slotRecipeFn, contextName, options)
  const usePropsContext = () => useContext(createContextId(`${ctx}-props`), null)?.value

  const PropsProvider = (props) => jsx(PropsHost, { value: props.value, children: props.children, __ctx: `${ctx}-props` })

  const withRootProvider = (Component, partOptions) => {
    const part = noSerialize({ recipe: slotRecipeFn, Styled: Component, slot: '', options: partOptions })
    const WithRootProvider = (props) => renderHost(SlotRootProvider, ctx, part, props, partOptions?.defaultProps?.children)
    WithRootProvider.displayName = `withRootProvider(${getDisplayName(Component)})`
    return WithRootProvider
  }

  const withProvider = (Component, slot, partOptions) => {
    const Styled = styledPart(Component, {}, partOptions)
    const part = noSerialize({ recipe: slotRecipeFn, Styled, slot, options: partOptions })
    const WithProvider = (props) => renderHost(SlotProvider, ctx, part, props, partOptions?.defaultProps?.children)
    WithProvider.displayName = `withProvider(${getDisplayName(Component)})`
    return WithProvider
  }

  const withContext = (Component, slot, partOptions) => {
    const componentName = getDisplayName(Component)
    const missing = `Component "${componentName}" (slot: "${slot}") cannot access ${contextName} because it's missing its Provider.`
    const Styled = styledPart(Component, {}, partOptions)
    const part = noSerialize({ recipe: slotRecipeFn, Styled, slot, options: partOptions, missing })
    const WithContext = (props) => renderHost(SlotConsumer, ctx, part, props, partOptions?.defaultProps?.children)
    WithContext.displayName = `withContext(${componentName})`
    return WithContext
  }

  return {
    withRootProvider,
    withProvider,
    withContext,
    PropsProvider,
    usePropsContext,
  }
}