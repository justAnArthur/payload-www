import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.int.spec.ts', 'tests/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    // inlined so tests can mock its `server-only` import
    server: { deps: { inline: ['@pro-laico/payload-revalidate'] } }
  }
})
