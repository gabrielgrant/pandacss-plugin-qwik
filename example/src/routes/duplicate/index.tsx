import { component$ } from '@qwik.dev/core'
import { createSlotRecipeContext } from 'styled-system/jsx'
import { card } from 'styled-system/recipes'

// A second context for `card` without an `id`, so it shares `cardContext`'s Qwik context.
// In development this logs a warning when the module loads.
const duplicate = createSlotRecipeContext(card)
const Title = duplicate.withContext('h2', 'title')
const Root = duplicate.withProvider('article', 'root')

export default component$(() => (
  <Root id="duplicate">
    <Title>Shares the card context</Title>
  </Root>
))
