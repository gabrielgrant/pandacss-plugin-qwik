// Compile-time checks for the generated Qwik JSX types (`tsc --noEmit`); never rendered.
import { component$ } from '@qwik.dev/core'
import { createRecipeContext, createSlotRecipeContext, Stack, styled, type HTMLStyledProps, type StyledVariantProps } from 'styled-system/jsx'
import { badge, card } from 'styled-system/recipes'

const ctx = createSlotRecipeContext(card)
const Root = ctx.withProvider('div', 'root')
const Title = ctx.withContext('h3', 'title')
// @ts-expect-error unknown slot
ctx.withContext('div', 'footer')

const Button = styled('button', { variants: { size: { sm: {}, lg: {} } } })
type ButtonVariants = StyledVariantProps<typeof Button>
const variants: ButtonVariants = { size: 'sm' }

const Badge = createRecipeContext(badge).withContext('span')

const props: HTMLStyledProps<'a'> = { href: '/', color: 'red.500' }

export const TypeChecks = component$(() => (
  <Stack gap="4">
    <Root size="lg" p="2" onClick$={() => {}}>
      <Title unstyled>title</Title>
    </Root>
    {/* @ts-expect-error unknown variant value */}
    <Root size="xl" />
    <Button size={variants.size} disabled>
      ok
    </Button>
    {/* @ts-expect-error unknown variant value */}
    <Button size="md" />
    <Badge tone="danger" />
    <styled.a {...props} />
  </Stack>
))
