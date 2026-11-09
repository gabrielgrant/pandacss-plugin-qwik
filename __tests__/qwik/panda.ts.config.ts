import config from './panda.config'

// `outExtension: 'ts'` output, type-checked by the vitest typecheck run.
export default { ...config, outExtension: 'ts', outdir: 'styled-system-ts' }
