import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

export default defineConfig({
  entry: [
    'src/exports/*'
  ],
  format: ['esm'],
  clean: true,
  plugins: [
    exports()
  ]
}) as DefineConfigItem
