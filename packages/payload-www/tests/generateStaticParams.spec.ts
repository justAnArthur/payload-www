import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }))
vi.mock('next-intl/server', () => ({ setRequestLocale: () => {} }))
vi.mock('@justanarthur/payload-plugin-seo/next-metadata', () => ({
  createSiteDefaults: async () => ({}),
  generateMeta: async () => ({})
}))
vi.mock('../src/render/renderWWWModule', () => ({ renderWWWDataModule: () => null }))

type Doc = { id: number; slugs: Record<string, string | null> }

// id 1 is the index document: an empty slug in en/uk, and untranslated (null) in de.
// id 4 claims the empty slug in en/uk too, so the enumeration has to pick one of the two.
const docs: Doc[] = [
  { id: 1, slugs: { en: '', uk: '', de: null } },
  { id: 2, slugs: { en: 'about', uk: 'pro-nas', de: 'ueber-uns' } },
  { id: 3, slugs: { en: 'legal_terms', uk: 'legal_terms', de: 'legal_terms' } },
  { id: 4, slugs: { en: '', uk: '', de: 'extra' } }
]

const slugIn = (doc: Doc, locale: string) => doc.slugs[locale] ?? null

type FindArgs = {
  locale: string
  limit?: number
  where?: { slug?: { equals?: string | null } }
}

// payload's where clause reads the locale's own column — no fallback, so null only matches null
const find = vi.fn(async ({ locale, limit, where }: FindArgs) => {
  const matching = where?.slug
    ? docs.filter((doc) => slugIn(doc, locale) === (where.slug?.equals ?? null))
    : docs
  const page = limit ? matching.slice(0, limit) : matching
  return { docs: page, totalDocs: matching.length, page: 1, totalPages: 1 }
})

const findByID = async ({ id, locale }: { id: number; locale: string }) => {
  const doc = docs.find((d) => d.id === id)
  return doc ? { id: doc.id, slug: slugIn(doc, locale) } : null
}

vi.mock('payload', () => ({
  getPayload: async () => ({
    config: { collections: [], globals: [], custom: { payloadRevalidate: { lists: {}, options: {} } } },
    find,
    findByID
  })
}))

const { createCollectionPageExports } = await import('../src/render/pages/createCollectionPageExports')
const { queryDocBySlug, seedPayloadCache } = await import('../src/render/metadata/query')

const routing = { locales: ['en', 'uk', 'de'], defaultLocale: 'en', localePrefix: 'as-needed' }

function exportsFor(slugShape: 'single' | 'catch-all') {
  return createCollectionPageExports(
    {
      _payloadConfig: Promise.resolve({} as never),
      importMap: {} as never,
      routing: routing as never,
      slugShape
    },
    { getServerSideURL: () => 'https://example.com' }
  )
}

const params = (slugShape: 'single' | 'catch-all') =>
  exportsFor(slugShape).generateStaticParams({ params: {} })

beforeAll(() => {
  seedPayloadCache({ config: Promise.resolve({} as never) })
})

describe('generateStaticParams', () => {
  it('enumerates the index document for a catch-all route', async () => {
    const entries = await params('catch-all')

    expect(entries).toContainEqual({ locale: 'en', slug: [] })
    expect(entries).toContainEqual({ locale: 'uk', slug: [] })
  })

  it('enumerates the index document once per locale when several docs claim the empty slug', async () => {
    const entries = await params('catch-all')

    expect(entries.filter((entry) => entry.locale === 'en' && entry.slug.length === 0)).toHaveLength(1)
  })

  it('enumerates the index document for a locale that stores null instead of an empty slug', async () => {
    const entries = await params('catch-all')

    expect(entries).toContainEqual({ locale: 'de', slug: [] })
  })

  it('still enumerates nested and plain slugs', async () => {
    const entries = await params('catch-all')

    expect(entries).toContainEqual({ locale: 'en', slug: ['about'] })
    expect(entries).toContainEqual({ locale: 'en', slug: ['legal', 'terms'] })
  })

  it('skips the index document for a required [slug] route, which has no path for it', async () => {
    const entries = await params('single')

    expect(entries.filter((entry) => entry.slug === '')).toHaveLength(0)
    expect(entries).toContainEqual({ locale: 'en', slug: 'about' })
    expect(entries).toContainEqual({ locale: 'en', slug: 'legal_terms' })
  })
})

describe('queryDocBySlug on an empty slug', () => {
  it('serves the first document storing an empty slug', async () => {
    expect(await queryDocBySlug({ collectionSlug: 'pages', slug: '', locale: 'en' })).toMatchObject({ id: 1 })
  })

  it('falls back to a null slug when no document stores an empty one', async () => {
    expect(await queryDocBySlug({ collectionSlug: 'pages', slug: '', locale: 'de' })).toMatchObject({ id: 1 })
  })

  it('does not fall back to a null slug for a non-empty request', async () => {
    expect(await queryDocBySlug({ collectionSlug: 'pages', slug: 'missing', locale: 'de' })).toBeNull()
  })
})
