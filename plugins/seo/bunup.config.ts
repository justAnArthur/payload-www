import { defineConfig, type DefineConfigItem } from 'bunup'

export default defineConfig({
  entry: [
    'src/exports/*'
  ],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true }
}) as DefineConfigItem
