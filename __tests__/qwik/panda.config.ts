import presetBase from '@pandacss/preset-base'
import presetPanda from '@pandacss/preset-panda'
import pluginQwik from '../../src/index'
import codegenPreset from './preset'

// Same recipes and options as Panda's Qwik codegen sandbox (sandbox/codegen/panda.qwik.config.ts).
export default {
  presets: [presetBase, presetPanda, codegenPreset],
  preflight: true,
  include: [],
  outdir: 'styled-system',
  jsxFramework: 'qwik',
  plugins: [pluginQwik()],
}
