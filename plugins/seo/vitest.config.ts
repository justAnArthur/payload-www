import { readFileSync, existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'










const parseEnvFile = (path: string): Record<string, string> => {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0 || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export default defineConfig(() => ({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    testTimeout: 60_000,
    pool: 'forks',
    env: {
      ...parseEnvFile('.env.test.local'),
      ...parseEnvFile('.env.test')
    }
  }
}))
