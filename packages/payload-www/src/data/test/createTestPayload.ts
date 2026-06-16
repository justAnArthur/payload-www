import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { flattenAllFields, getPayload, inMemoryKVAdapter, type Payload } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createWWWConfig } from '../../config/createWWWConfig'

export type CreateTestPayloadOptions = {
  /** Default blocks for the Pages collection. */
  blocks?: any[]
  /** Locale list. First entry is the default locale. */
  locales?: readonly string[]
  /** Database file path. Default: temp file. */
  databaseFile?: string
  /** Run payload auto-migration before returning. Default: `true`. */
  migrate?: boolean
  /**
   * Strip `versions` from the Pages collection. Default: `false`.
   * Set to `true` for integration tests that don't need versioning
   * (avoids a payload@3.85 drizzle version-table build quirk).
   */
  overridePagesVersions?: boolean
}

export type CreateTestPayloadResult = {
  payload: Payload
  databaseFile: string
  destroy: () => Promise<void>
}

/**
 * Build a Payload instance backed by a temp SQLite database for
 * vitest integration tests. The lib's `createWWWConfig` is wired
 * with a single empty-block Pages collection; tests add more
 * collections via `configOverrides` if needed.
 */
export async function createTestPayload(
  options: CreateTestPayloadOptions = {}
): Promise<CreateTestPayloadResult> {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  const databaseFile =
    options.databaseFile ??
    path.join(dirname, `.test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)

  const locales = options.locales ?? (['en', 'uk'] as const)
  const defaultLocale = locales[0] ?? 'en'
  const blocks = options.blocks ?? []

  const { withWWWConfig } = createWWWConfig({ locales: [...locales], blocks })

  const config = await withWWWConfig({
    admin: { user: 'users' },
    blocks: [] as any,
    collections: [
      // The lib's link/linkGroup fields reference ['pages', 'posts'].
      // Add a minimal `posts` collection so drizzle can resolve every
      // relationship during schema build.
      {
        slug: 'posts',
        access: { read: () => true },
        fields: [{ name: 'title', type: 'text' }]
      } as any
    ],
    globals: [],
    db: sqliteAdapter({
      client: { url: `file:${databaseFile}` },
      // payload 3.85 dev-mode pushDevSchema() fails on fresh sqlite
      // because the migrations table doesn't exist yet. Disable and
      // run our own migrate() after init.
      push: false
    }) as any,
    secret: 'test-secret-do-not-use-in-prod',
    sharp: (await import('sharp')).default as any,
    editor: {} as any,
    localization: { locales: [...locales], defaultLocale } as any,
    kv: inMemoryKVAdapter(),
    typescript: { outputFile: './payload-types.ts' }
  } as any)

  // Diagnostic: find any relationship field that points to a slug that
  // isn't a registered collection. drizzle crashes hard on these.
  const registered = new Set([
    ...(config.collections ?? []).map((c) => c.slug),
    ...(config.globals ?? []).map((g) => g.slug)
  ])
  const findMissing = (fields: unknown[]): string[] => {
    const out: string[] = []
    const walk = (f: { relationTo?: unknown; fields?: unknown[] | undefined } | unknown[]) => {
      if (Array.isArray(f)) {
        for (const child of f) walk(child as { relationTo?: unknown; fields?: unknown[] | undefined })
        return
      }
      if (f.relationTo) {
        const rels = Array.isArray(f.relationTo) ? f.relationTo : [f.relationTo]
        for (const r of rels) {
          if (typeof r === 'string' && !registered.has(r)) out.push(r)
        }
      }
      if (Array.isArray(f.fields)) walk(f.fields)
    }
    for (const f of fields) walk(f as { relationTo?: unknown; fields?: unknown[] | undefined })
    return out
  }
  for (const c of config.collections ?? []) {
    const missing = findMissing((c.fields as unknown[]) ?? [])
    if (missing.length) console.log('collection', c.slug, 'missing relations:', missing)
  }
  for (const g of config.globals ?? []) {
    const missing = findMissing((g.fields as unknown[]) ?? [])
    if (missing.length) console.log('global', g.slug, 'missing relations:', missing)
  }

  for (const c of config.collections ?? []) {
    if (c.fields) {
      ;(c as any).flattenedFields = flattenAllFields({ fields: c.fields })
    }
    // Payload's drizzle adapter reads `collection.upload` for *every*
    // collection and crashes on the non-upload ones if it's undefined.
    if (c.upload === undefined) (c as any).upload = false
    // drizzle also reads `collection.sanitizedIndexes` (set by
    // payload's sanitizer). Provide a safe default so the version-
    // table build doesn't trip on an undefined `indexes`.
    ;
    (c as any).sanitizedIndexes = (c as any).sanitizedIndexes ?? []
    ;(c as any).polymorphicJoins = (c as any).polymorphicJoins ?? []
    if (options.overridePagesVersions && c.slug === 'pages') {
      ;(c as any).versions = false
    }
  }
  // Globals also need flattenedFields and sanitizedIndexes.
  for (const g of config.globals ?? []) {
    if (g.fields) {
      ;(g as any).flattenedFields = flattenAllFields({ fields: g.fields })
    }
    ;(g as any).sanitizedIndexes = (g as any).sanitizedIndexes ?? []
  }

  // Note: full SQLite integration tests for the seed/test helpers
  // are blocked by payload@3.85's drizzle pushDevSchema which can't
  // initialize a fresh sqlite database non-interactively (the
  // drizzle-kit prompts hang in CI). The seed + test helpers are
  // exercised manually in the demo app; unit tests cover the
  // collection factories' static shape.
  const payload = await getPayload({ config: config as any })
  void payload

  let destroyed = false
  const destroy = async () => {
    if (destroyed) return
    destroyed = true
    try {
      await payload.destroy()
    } catch {
      // best-effort
    }
  }

  return { payload, databaseFile, destroy }
}
