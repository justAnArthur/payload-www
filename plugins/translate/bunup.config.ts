import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

export default defineConfig({
  entry: [
    'src/exports/*',
    'src/exports/resolvers/*'
  ],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true },
  sourceBase: './src/exports',
  plugins: [
    exports({
    })
  ]
}) as DefineConfigItem
