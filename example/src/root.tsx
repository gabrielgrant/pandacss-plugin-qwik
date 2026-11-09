import { component$ } from '@qwik.dev/core'
import { QwikRouterProvider, RouterOutlet } from '@qwik.dev/router'
import './global.css'

export default component$(() => (
  <QwikRouterProvider>
    <head>
      <meta charset="utf-8" />
      <title>Panda + Qwik 2 plugin</title>
      <link rel="icon" href="data:," />
    </head>
    <body lang="en">
      <RouterOutlet />
    </body>
  </QwikRouterProvider>
))
