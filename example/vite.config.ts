import { defineConfig } from 'vite'
import { qwikVite } from '@qwik.dev/core/optimizer'
import { qwikRouter } from '@qwik.dev/router/vite'
import { pandacss } from '@pandacss/vite'

const dir = (path: string) => new URL(path, import.meta.url).pathname

export default defineConfig(() => ({
  plugins: [pandacss({ transform: process.env.PANDA_TRANSFORM === '1' }), qwikRouter(), qwikVite()],
  resolve: {
    alias: {
      'styled-system-minimal': dir('./styled-system-minimal'),
      'styled-system-none': dir('./styled-system-none'),
      'styled-system': dir('./styled-system'),
      '~': dir('./src'),
    },
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
}))
