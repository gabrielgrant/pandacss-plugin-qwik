import { component$ } from '@qwik.dev/core'
import { CardTitle } from '~/components/card'

// Rendered without its Card: SSR fails with the missing-provider error.
export default component$(() => <CardTitle>Orphan</CardTitle>)
