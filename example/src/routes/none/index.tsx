import { component$, useSignal } from '@qwik.dev/core'
import { css, sva } from 'styled-system-none/css'
import { createSlotRecipeContext, styled } from 'styled-system-none/jsx'

// An sva recipe resolves slots to style objects, which is where jsxStyleProps matters.
const panel = sva({
  slots: ['root', 'title'],
  base: { root: { p: '4' }, title: { fontWeight: 'bold' } },
  variants: { size: { md: { title: { fontSize: 'md' } }, lg: { title: { fontSize: 'lg' } } } },
})

// Both routes build the same sva config, so each context needs its own id.
const panelContext = createSlotRecipeContext(panel, { id: 'none-panel' })
const Panel = panelContext.withProvider('section', 'root')
const PanelTitle = panelContext.withContext('h2', 'title')

const ProvidedPanel = component$(() => (
  <Panel id="provided-panel" class="provided">
    <PanelTitle class="title">Provided title</PanelTitle>
  </Panel>
))

export default component$(() => {
  const count = useSignal(0)
  const size = count.value % 2 === 0 ? 'md' : 'lg'

  return (
    <div>
      <styled.button
        id="count"
        class={css({ bg: count.value % 2 === 0 ? 'blue.500' : 'blue.700' })}
        onClick$={() => count.value++}
      >
        Clicked {count.value} times
      </styled.button>

      <Panel id="panel" size={size} class="panel">
        <PanelTitle class="title">Title</PanelTitle>
      </Panel>

      <panelContext.PropsProvider value={{ size }}>
        <ProvidedPanel />
      </panelContext.PropsProvider>
    </div>
  )
})
