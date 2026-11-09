import { qwikVite } from '@qwik.dev/core/optimizer'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 60_000,
    projects: [
      { test: { name: 'codegen', include: ['__tests__/*.test.ts'] } },
      {
        // The SSR and type tests from Panda's Qwik codegen sandbox, run against this plugin's output.
        plugins: [qwikVite()],
        test: {
          name: 'qwik',
          include: ['__tests__/qwik/*.test.{ts,tsx}'],
          globalSetup: ['__tests__/qwik/global-setup.ts'],
          typecheck: { enabled: true, include: ['__tests__/qwik/*types.test.ts'], tsconfig: '__tests__/qwik/tsconfig.json' },
        },
      },
    ],
  },
})
