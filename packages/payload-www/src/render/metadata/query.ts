import type { DataFromCollectionSlug, DataFromGlobalSlug, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'
import {
  type CollectionGlobalLocaleIdentifiersArgs,
  createCollectionCacheKey
} from '../../collections/hooks/createRevalidateCollectionGlobalHook'

async function withUnstableCache<R>(
  keyParts: unknown[],
  tags: string[],
  fn: () => Promise<R>
): Promise<R> {
  const { unstable_cache } = await import('next/cache')
  return unstable_cache(fn, keyParts.map(String), { tags })()
}

export async function queryDoc(
  args: CollectionGlobalLocaleIdentifiersArgs,
  { config: configPromise }: { config: Promise<SanitizedConfig> }
) {
  return withUnstableCache(
    Object.values(args),
    [createCollectionCacheKey(args)],
    async () => {
      if ('globalSlug' in args)
        return queryGlobal({ ...args, config: configPromise })
      else
        return queryDocBySlug({ ...args, config: configPromise })
    }
  )
}

export async function queryDocBySlug<S extends string>(
  {
    collectionSlug,
    slug,
    slugField = 'slug',
    locale,
    draft = false,
    config
  }: {
    collectionSlug: S
    slug: string
    slugField?: string
    locale: string
    draft?: boolean
    config: Promise<SanitizedConfig>
  }): Promise<DataFromCollectionSlug<S> | null> {
  return withUnstableCache(
    [collectionSlug, slug, locale, draft],
    [createCollectionCacheKey({ collectionSlug, slug, locale })],
    async () => {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: collectionSlug,
        draft,
        limit: 1,
        pagination: false,
        overrideAccess: draft,
        where: { [slugField]: { equals: slug } },
        locale
      })
      return result.docs?.[0] ?? null
    }
  )
}

export async function queryGlobal<G extends string>(
  {
    globalSlug,
    locale,
    draft = false,
    config
  }: {
    globalSlug: G
    locale: string
    depth?: number
    draft?: boolean
    config: Promise<SanitizedConfig>
  }): Promise<DataFromGlobalSlug<G> | null> {
  return withUnstableCache(
    [globalSlug, locale, draft],
    [createCollectionCacheKey({ globalSlug, locale })],
    async () => {
      const payload = await getPayload({ config })
      try {
        return await payload.findGlobal({ slug: globalSlug, draft, locale })
      } catch (error) {
        console.warn('[WWW] queryGlobal failed', { globalSlug, locale, error: String(error) })
        return null
      }
    }
  )
}


export async function queryAllDocs<S extends string>(
  {
    collectionSlug,
    slugField = 'slug',
    locale,
    config
  }: {
    collectionSlug: S
    slugField?: string
    locale: string
    config: Promise<SanitizedConfig>
  }): Promise<DataFromCollectionSlug<S>[]> {
  return withUnstableCache(
    [collectionSlug, slugField, locale],
    [createCollectionCacheKey({ collectionSlug, slug: '__all__', locale })],
    async () => {
      const payload = await getPayload({ config })
      // ponytail: bypass Payload's Drizzle adapter for the slug sweep.
      // Payload 3.85's Drizzle adapter for Postgres builds a broken query
      // for localized collections — it joins the locales table and includes
      // non-localized fields like `slug` in the lateral join's json_agg,
      // producing `select "pages_locales"."slug" from "pages_locales"` which
      // crashes because `slug` lives on `pages`, not on `pages_locales`. We
      // only need the slug per doc, so we go to raw SQL via the underlying
      // Drizzle pg client. The query: just `id, slug` from the main table.
      const collectionConfig = payload.collections[collectionSlug]?.config
      if (!collectionConfig) return []
      // Resolve the actual table name the collection lives in.
      // For pages, dbName is unset so it's "pages".
      const tableName = (collectionConfig as { dbName?: string }).dbName ?? collectionConfig.slug
      const snakeSlugField = (() => {
        // slugs are stored as `slug` in the DB regardless of the field name
        return slugField
      })()
      const drizzleDb = (payload.db as { drizzle?: { execute?: (q: unknown) => Promise<{ rows: unknown[] }> } })
        .drizzle
      if (!drizzleDb?.execute) {
        // Fallback: payload.find (will fail on the broken SQL if it triggers the bug)
        const result = await payload.find({
          collection: collectionSlug,
          draft: false,
          limit: 1000,
          pagination: false,
          overrideAccess: true
        })
        return (result.docs ?? []).map((d) => ({ [slugField]: (d as Record<string, unknown>)[slugField] }) as DataFromCollectionSlug<S>)
      }
      // Access check via payload: only return published slugs for the front-end.
      // We use overrideAccess: true here because (a) the build is
      // unauthenticated and (b) the lib's read-side access returns the
      // already-published status filter; we'll mirror that with a literal
      // status = 'published' WHERE if versions are enabled.
      const hasVersions = Boolean((collectionConfig as { versions?: boolean }).versions)
      const useStatusFilter = hasVersions
      const sqlText = useStatusFilter
        ? `SELECT id, "${snakeSlugField}", "updated_at" FROM "${tableName}" WHERE "_status" = 'published' ORDER BY "created_at" DESC LIMIT 1000`
        : `SELECT id, "${snakeSlugField}", "updated_at" FROM "${tableName}" ORDER BY "created_at" DESC LIMIT 1000`
      // Use the Drizzle SQL tag via raw() so execute() gets a real SQL object
      // (the pg client behind it expects an object with .getSQL() / .getParams()).
      const { sql: drizzleSql } = await import('drizzle-orm')
      const result = await drizzleDb.execute(drizzleSql.raw(sqlText))
      const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? []
      return rows.map((r) => ({ [slugField]: r[snakeSlugField], id: r.id, updatedAt: r.updated_at }) as unknown as DataFromCollectionSlug<S>)
    }
  )
}

export async function queryAllLocaleSlugs(
  {
    collectionSlug,
    id,
    slugField = 'slug',
    config
  }: {
    collectionSlug: string
    id: number | string
    slugField?: string
    config: Promise<SanitizedConfig>
  }): Promise<Record<string, string> | null> {
  const payload = await getPayload({ config })
  const collectionConfig = payload.collections[collectionSlug]?.config
  if (!collectionConfig) return null
  // ponytail: bypass Payload's Drizzle adapter here too. The `findByID` with
  // `locale: 'all'` against a localized collection trips the same SQL bug
  // as `find` does. Go to raw SQL: read the slug per locale from the
  // `_locales` table directly.
  const tableName = (collectionConfig as { dbName?: string }).dbName ?? collectionConfig.slug
  const snakeSlugField = slugField
  const localesTableName = `${tableName}_locales`
  const drizzleDb = (payload.db as { drizzle?: { execute?: (q: unknown) => Promise<{ rows: unknown[] }> } })
    .drizzle
  if (!drizzleDb?.execute) {
    const doc = await payload.findByID({
      collection: collectionSlug,
      id,
      locale: 'all',
      select: { [slugField]: true }
    })
    return (doc?.[slugField] as Record<string, string> | undefined) ?? null
  }
  const { sql: drizzleSql } = await import('drizzle-orm')
  const result = await drizzleDb.execute(
    drizzleSql.raw(
      `SELECT _locale, "${snakeSlugField}" FROM "${localesTableName}" WHERE "_parent_id" = $1`
    )
  )
  const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? []
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (typeof r._locale === 'string' && typeof r[snakeSlugField] === 'string') {
      out[r._locale] = r[snakeSlugField] as string
    }
  }
  return out
}
