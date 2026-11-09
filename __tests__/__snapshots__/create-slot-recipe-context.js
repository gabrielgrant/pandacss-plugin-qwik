import { jsx } from '@qwik.dev/core';
import { sva } from '../css/index';
import { getDisplayName } from './helper';
import { PropsProviderHost, SlotConsumerHost, SlotProviderHost, SlotRootProviderHost, contextKey, factoryOptions, recipeProp, usePropsValue } from './context-hosts.qwik';

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
  const contextName = recipeName ? `createSlotRecipeContext("${recipeName}")` : 'createSlotRecipeContext'
  const slotRecipeFn = isRuntimeRecipe ? recipe : sva(recipe.config ?? recipe)
  const key = contextKey('slot', slotRecipeFn)
  const __recipe = recipeProp(slotRecipeFn)

  const withRootProvider = (Component, options) => {
    const { children: defaultChildren, ...defaults } = options?.defaultProps ?? {}
    const WithRootProvider = ({ children, ...props }) =>
      jsx(SlotRootProviderHost, { ...props, __key: key, __cmp: Component, __recipe, __defaults: defaults, children: children ?? defaultChildren })
    WithRootProvider.displayName = `withRootProvider(${getDisplayName(Component)})`
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
    WithProvider.displayName = `withProvider(${getDisplayName(Component)})`
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
    WithContext.displayName = `withContext(${componentName})`
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
