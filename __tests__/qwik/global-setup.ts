import { createNodeDriver } from '@pandacss/dev/node'

export default async function setup() {
  for (const configPath of ['panda.config.ts', 'panda.ts.config.ts']) {
    const driver = await createNodeDriver({ cwd: import.meta.dirname, configPath })
    driver.codegen()
  }
}
