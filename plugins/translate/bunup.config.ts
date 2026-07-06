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
  // Defense-in-depth for JSX runtime: bunup picks jsx-dev vs jsx based on
  // NODE_ENV. The build script in package.json sets NODE_ENV=production,
  // which is the actual switch. The `development: false` here mirrors what
  // the seo plugin does, in case future bunup versions start honoring it.
  jsx: {
    runtime: 'automatic',
    importSource: 'react',
    development: false
  },
  plugins: [
    exports({
    })
  ]
}) as DefineConfigItem
