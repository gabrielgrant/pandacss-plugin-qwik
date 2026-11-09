import { defineConfig } from '@pandacss/dev'
import presetBase from '@pandacss/preset-base'
import presetPanda from '@pandacss/preset-panda'
import pluginQwik from 'pandacss-plugin-qwik'

export default defineConfig({
  presets: [presetBase, presetPanda],
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',
  jsxFramework: 'qwik',
  plugins: [pluginQwik()],
  theme: {
    extend: {
      recipes: {
        badge: {
          className: 'badge',
          base: { px: '2', borderRadius: 'sm' },
          variants: {
            tone: { info: { bg: 'blue.100' }, danger: { bg: 'red.100' } },
          },
          defaultVariants: { tone: 'info' },
        },
      },
      slotRecipes: {
        card: {
          className: 'card',
          slots: ['root', 'title', 'body'],
          base: {
            root: { padding: '6', borderRadius: 'lg', bg: 'white', color: 'gray.900' },
            title: { fontWeight: 'bold' },
            body: { color: 'gray.600' },
          },
          variants: {
            size: {
              md: { root: { fontSize: 'md' }, title: { fontSize: 'lg' } },
              lg: { root: { fontSize: 'lg' }, title: { fontSize: '2xl' } },
            },
          },
          defaultVariants: { size: 'md' },
        },
      },
    },
  },
})
