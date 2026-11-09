import { component$, Slot } from '@qwik.dev/core'
import { sva } from 'styled-system/css'
import { createRecipeContext, createSlotRecipeContext } from 'styled-system/jsx'
import { badge, card } from 'styled-system/recipes'

const cardContext = createSlotRecipeContext(card)
export const Card = cardContext.withProvider('article', 'root')
export const CardTitle = cardContext.withContext('h2', 'title', {
  defaultProps: { children: <>Default title</> },
})
export const CardBody = cardContext.withContext('div', 'body')
export const CardPropsProvider = cardContext.PropsProvider
export const CardRoot = cardContext.withRootProvider('section')
export const useCardProps = cardContext.usePropsContext

const Link = component$<{ id?: string; href?: string; class?: string; color?: string }>((props) => (
  <a id={props.id} href={props.href} class={props.class} data-color={props.color}>
    <Slot />
  </a>
))
export const CardLink = cardContext.withContext(Link, 'body', { forwardProps: ['color'] })
export const CardFancy = cardContext.withContext('p', 'body', {
  shouldForwardProp: (prop) => prop === 'title' || prop.startsWith('aria-'),
})

const alert = sva({
  slots: ['root', 'icon'],
  base: { root: { display: 'flex', gap: '2', borderWidth: '1px' }, icon: { color: 'orange.600' } },
  variants: { status: { warn: { root: { borderColor: 'orange.400' } }, ok: { root: { borderColor: 'green.400' } } } },
  defaultVariants: { status: 'warn' },
})
const alertContext = createSlotRecipeContext(alert)
export const Alert = alertContext.withProvider('div', 'root')
export const AlertIcon = alertContext.withContext('span', 'icon')

const badgeContext = createRecipeContext(badge)
export const Badge = badgeContext.withContext('span', { dataAttr: true })
export const BadgePropsProvider = badgeContext.PropsProvider
