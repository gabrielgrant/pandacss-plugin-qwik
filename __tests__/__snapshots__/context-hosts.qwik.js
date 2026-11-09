import { Slot, component$, createContextId, jsx, noSerialize, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { cx } from '../css/index';
import { styled } from './factory';
import { mergeDefaultProps } from './helper';
import { isCssProperty } from './is-valid-prop';

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
  const name = recipe.__name__ ?? `anonymous-${hash(JSON.stringify(recipe.config ?? recipe) ?? '')}`
  return `panda.${kind}.${String(name).replace(/[^A-Za-z0-9_.-]/g, '_')}`
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
  styled(
    Component,
    recipe,
    forward ? { ...options, shouldForwardProp: (prop, keys) => forward[prop] ?? (!keys.includes(prop) && !isCssProperty(prop)) } : options,
  )

const usePropsStore = (key) => {
  const store = useContext(createContextId(`${key}.props`), NOT_FOUND)
  return isFound(store) ? store : undefined
}

export const usePropsValue = (key) => usePropsStore(key)?.value

const useRecipeProps = (key, recipe, props) => {
  const store = usePropsStore(key)
  const resolved = recipe ?? store?.recipe
  if (!resolved) throw new Error(`pandacss-plugin-qwik: the recipe for "${key}" is not available on this render`)
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
  useContextProvider(createContextId(`${key}.styles`), store)
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
  useContextProvider(createContextId(`${props.__key}.props`), store)
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
  const store = useContext(createContextId(`${__key}.styles`), NOT_FOUND)
  if (!isFound(store)) {
    const componentInfo = __name ? `Component "${__name}"` : 'A component'
    throw new Error(`${componentInfo} (slot: "${__slot}") cannot access ${__label} because it's missing its Provider.`)
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
