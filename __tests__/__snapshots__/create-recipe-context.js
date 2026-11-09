import { jsx } from '@qwik.dev/core';
import { cva } from '../css/index';
import { getDisplayName } from './helper';
import { PropsProviderHost, RecipeContextHost, contextKey, factoryOptions, recipeProp, usePropsValue } from './context-hosts.qwik';

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
    WithContext.displayName = `withContext(${getDisplayName(Component)})`
    return WithContext
  }

  const PropsProvider = ({ value, children }) => jsx(PropsProviderHost, { __key: key, __recipe, value, children })

  return {
    withContext,
    PropsProvider,
    usePropsContext: () => usePropsValue(key),
  }
}
