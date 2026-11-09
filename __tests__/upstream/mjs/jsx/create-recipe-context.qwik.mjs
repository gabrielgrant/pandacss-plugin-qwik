import { Slot, SkipRender, component$, createContextId, createSignal, isDev, isSignal, jsx, noSerialize, untrack, useContext, useContextProvider, useStore } from '@qwik.dev/core';
import { panda } from './factory.mjs';
import { getDisplayName, mergeDefaultProps } from './helper.mjs';
import { toHash } from '../helpers.mjs';
import { cx } from '../css/index.mjs';

const styledPart = panda

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
  if (hostProps.class != null) hostProps.class = toClassName(hostProps.class)
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

function toClassName(value) {
  if (isSignal(value)) return toClassName(value.value)
  if (!value || typeof value === 'string') return value || undefined
  if (Array.isArray(value)) return cx(...value.map(toClassName))
  return cx(...Object.keys(value).filter((key) => value[key]))
}

function resolveRecipe(recipe) {
  if (recipe == null) throw new Error('createRecipeContext requires a recipe')
  if (typeof recipe === 'function') return recipe
  if (recipe.base || recipe.variants || recipe.defaultVariants || recipe.compoundVariants) return recipe
  throw new Error('createRecipeContext requires a recipe')
}

const RecipeConsumer = component$((props) => {
  const { __ctx, __part, __tick, __seen, ...ownProps } = props
  const contextProps = useContext(createContextId(__ctx), null)?.value
  const part = __part
  if (!part) {
    // Resumed before its wrapper ran: re-run the wrapper's component and keep the current DOM. The read
    // is untracked so this host doesn't subscribe to the tick.
    untrack(() => __tick.value++)
    return SkipRender
  }
  const mergedProps = contextProps ? mergeDefaultProps(contextProps, ownProps) : ownProps
  return jsx(part.Styled, { ...mergedProps, children: jsx(Slot, {}) })
})

export function createRecipeContext(recipeInput, options) {
  const recipe = resolveRecipe(recipeInput)
  const ctx = contextId('panda-recipe', recipe, 'createRecipeContext', options)
  const usePropsContext = () => useContext(createContextId(ctx), null)?.value

  const PropsProvider = (props) => jsx(PropsHost, { value: props.value, children: props.children, __ctx: ctx })

  const withContext = (Component, partOptions) => {
    const part = noSerialize({ Styled: styledPart(Component, recipe, partOptions) })
    const WithContext = (props) => renderHost(RecipeConsumer, ctx, part, props, partOptions?.defaultProps?.children)
    WithContext.displayName = `withContext(${getDisplayName(Component)})`
    return WithContext
  }

  return {
    withContext,
    PropsProvider,
    usePropsContext,
  }
}