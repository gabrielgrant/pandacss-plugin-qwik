import { component$, Slot } from '@qwik.dev/core'
import { styled } from 'styled-system/jsx'

export default component$(() => (
  <styled.main p="6" bg="gray.100" minH="100vh">
    <Slot />
  </styled.main>
))
