import { defineConfig } from 'vite'
import { qwikVite } from '@qwik.dev/core/optimizer'
import { qwikRouter } from '@qwik.dev/router/vite'
import { pandacss } from '@pandacss/vite'

export default defineConfig(() => ({
  plugins: [pandacss({ transform: process.env.PANDA_TRANSFORM === '1' }), qwikRouter(), qwikVite()],
  resolve: { alias: { 'styled-system': new URL('./styled-system', import.meta.url).pathname, '~': new URL('./src', import.meta.url).pathname } },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
}))
