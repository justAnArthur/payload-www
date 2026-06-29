import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

export default defineConfig({
  entry: [
    'src/exports/*'
  ],
  format: ['esm'],
  clean: true,
  // Use the TypeScript compiler to infer declaration types instead of
  // bunup's default isolated-declarations mode. Isolated declarations
  // require explicit annotations on every export and emit warnings that
  // CI (CI=true) escalates to fatal errors. inferTypes sidesteps that.
  dts: { inferTypes: true },
  plugins: [
    exports({})
  ]
}) as DefineConfigItem
