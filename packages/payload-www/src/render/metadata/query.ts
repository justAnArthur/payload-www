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
      // Drizzle pg client.
      const collectionConfig = payload.collections[collectionSlug]?.config
      if (!collectionConfig) return []
      const tableName = (collectionConfig as { dbName?: string }).dbName ?? collectionConfig.slug
      const snakeSlugField = slugField
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
      const hasVersions = Boolean((collectionConfig as { versions?: boolean }).versions)
      // ponytail: figure out where the slug column lives. If the slug
      // field is localized, the column is on the *_locales table. Otherwise
      // it's on the main table. We only check the slug field's config — for
      // Pages the slug is localized, for Posts it's not.
      const isSlugLocalized = (() => {
        const fields = (collectionConfig as { fields?: Array<{ name?: string; localized?: boolean }> }).fields
        if (!Array.isArray(fields)) return false
        const found = fields.find((f) => f.name === slugField)
        return Boolean(found?.localized)
      })()
      const hasLocales = Boolean((collectionConfig as { custom?: { _isLocalized?: boolean } }).custom?._isLocalized) ||
        Boolean((payload.config.localization?.locales?.length))
      const localesTableName = `${tableName}_locales`
      let sqlText: string
      const safeLocale = locale.replace(/'/g, "''")
      if (isSlugLocalized && hasLocales) {
        const statusFilter = hasVersions ? ` AND "${tableName}"."_status" = 'published'` : ''
        sqlText = `
          SELECT DISTINCT ON ("${tableName}"."id")
            "${tableName}"."id" AS "id",
            "${localesTableName}"."${snakeSlugField}" AS "${snakeSlugField}",
            "${tableName}"."updated_at" AS "updated_at"
          FROM "${tableName}"
          JOIN "${localesTableName}" ON "${localesTableName}"."_parent_id" = "${tableName}"."id"
          WHERE "${localesTableName}"."_locale" = '${safeLocale}'${statusFilter}
          ORDER BY "${tableName}"."id", "${tableName}"."created_at" DESC
          LIMIT 1000
        `
      } else {
        const statusFilter = hasVersions ? ` WHERE "_status" = 'published'` : ''
        sqlText = `SELECT id, "${snakeSlugField}", "updated_at" FROM "${tableName}"${statusFilter} ORDER BY "created_at" DESC LIMIT 1000`
      }
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

  // ponytail: the slug field is not necessarily localized. Pages localizes it
  // (so it lives in `<table>_locales`), but a collection like Posts keeps a
  // single slug on the BASE table. Querying `<table>_locales` unconditionally
  // failed those with `column "slug" does not exist`. Decide from the config.
  const slugFieldConfig = (collectionConfig.fields as Array<Record<string, unknown>> | undefined)
    ?.find((f) => f && f.name === slugField)
  const slugIsLocalized = Boolean(slugFieldConfig?.localized)

  // ponytail: these must be parameterised `sql` templates, NOT `sql.raw`. `raw`
  // emits the string verbatim with no bind values, so the `$1` placeholder
  // reached Postgres with an empty params array and every call threw
  // `there is no parameter $1` — a 500 on any localized page that actually had
  // rows in <coll>_locales. `id` was in scope the whole time, just never bound.
  // Identifiers go through `sql.identifier` so they stay quoted/escaped.
  if (!slugIsLocalized) {
    const result = await drizzleDb.execute(
      drizzleSql`SELECT ${drizzleSql.identifier(snakeSlugField)} FROM ${drizzleSql.identifier(tableName)} WHERE "id" = ${id}`
    )
    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? []
    const slugValue = rows[0]?.[snakeSlugField]
    if (typeof slugValue !== 'string') return null
    // One slug shared by every locale — report it for all of them so hreflang
    // alternates and the language switcher still resolve.
    const localization = payload.config.localization
    const localeCodes: string[] = localization
      ? (localization.localeCodes ?? localization.locales.map((l: { code: string }) => l.code))
      : []
    if (localeCodes.length === 0) return null
    return Object.fromEntries(localeCodes.map((code) => [code, slugValue]))
  }

  const result = await drizzleDb.execute(
    drizzleSql`SELECT _locale, ${drizzleSql.identifier(snakeSlugField)} FROM ${drizzleSql.identifier(localesTableName)} WHERE "_parent_id" = ${id}`
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
