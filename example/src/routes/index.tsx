import { component$, useSignal } from '@qwik.dev/core'
import { css } from 'styled-system/css'
import { HStack, Stack, styled } from 'styled-system/jsx'
import {
  Alert,
  AlertIcon,
  Badge,
  BadgePropsProvider,
  Card,
  CardBody,
  CardFancy,
  CardLink,
  CardPropsProvider,
  CardRoot,
  CardTitle,
  useCardProps,
} from '~/components/card'

const ChildTitle = component$(() => <CardTitle id="child-title">Title in a child component</CardTitle>)

const PropsReader = component$(() => {
  const props = useCardProps()
  return <span id="props-reader">{String(props?.size ?? 'none')}</span>
})

// rendered by child components so a PropsProvider change re-renders the hosts without
// re-running the wrappers that hold the recipe
const ContextCard = component$(() => (
  <Card id="ctx-card">
    <CardTitle id="ctx-title">From props context</CardTitle>
    <PropsReader />
  </Card>
))

const ContextBadge = component$(() => <Badge id="badge">badge</Badge>)

const Fancy = styled('button', { base: { fontWeight: 'bold' }, variants: { tone: { a: { color: 'red.600' }, b: { color: 'blue.600' } } } })

export default component$(() => {
  const count = useSignal(0)
  const ctxSize = useSignal<'md' | 'lg'>('md')
  const tone = useSignal<'info' | 'danger'>('info')
  const orphan = useSignal(false)
  return (
    <Stack gap="6">
      <div class={css({ bg: 'purple.600', color: 'white', padding: '4' })}>Panda + Qwik 2</div>

      <HStack gap="3">
        <styled.button
          id="inc"
          bg="blue.500"
          color="white"
          px="4"
          py="2"
          borderRadius="md"
          onClick$={() => count.value++}
        >
          Clicked {count.value} times
        </styled.button>
        <button id="ctx-size" onClick$={() => (ctxSize.value = ctxSize.value === 'md' ? 'lg' : 'md')}>
          ctx {ctxSize.value}
        </button>
        <button id="tone" onClick$={() => (tone.value = tone.value === 'info' ? 'danger' : 'info')}>
          tone {tone.value}
        </button>
      </HStack>

      <Fancy id="fancy" tone={count.value % 2 === 0 ? 'a' : 'b'} class={{ 'is-odd': count.value % 2 === 1 }}>
        cva styled
      </Fancy>

      <Card id="card" size={count.value % 2 === 0 ? 'md' : 'lg'} mt="2">
        <CardTitle id="title">Slot recipe card</CardTitle>
        <CardTitle id="default-title" />
        <ChildTitle />
        <CardBody id="body" color="pink.700">
          Body text
        </CardBody>
        <CardBody id="unstyled" unstyled>
          Unstyled body
        </CardBody>
        <CardLink id="link" href="#x" color="tomato">
          link
        </CardLink>
        <CardFancy id="fancy-p" title="kept" aria-label="kept" color="green.700">
          forwarded
        </CardFancy>
      </Card>

      <CardPropsProvider value={{ size: ctxSize.value }}>
        <ContextCard />
      </CardPropsProvider>

      <CardRoot id="root-provider" size="lg">
        <CardTitle id="root-title">Root provider</CardTitle>
      </CardRoot>

      <Alert id="alert" status={count.value % 2 === 0 ? 'warn' : 'ok'}>
        <AlertIcon id="alert-icon">!</AlertIcon>
        sva context
      </Alert>

      <BadgePropsProvider value={{ tone: tone.value }}>
        <ContextBadge />
      </BadgePropsProvider>

      <button id="orphan" onClick$={() => (orphan.value = true)}>
        render orphan
      </button>
      <div id="orphan-host">{orphan.value && <CardTitle>Orphan rendered on the client</CardTitle>}</div>
    </Stack>
  )
})
