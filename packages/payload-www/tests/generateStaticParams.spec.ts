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
  if (!doc) return null
  return { id: doc.id, slug: locale === 'all' ? doc.slugs : slugIn(doc, locale) }
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

function exportsFor(slugShape: 'single' | 'catch-all', prerenderLocales?: string[], deps: Record<string, unknown> = {}) {
  return createCollectionPageExports(
    {
      _payloadConfig: Promise.resolve({} as never),
      importMap: {} as never,
      routing: routing as never,
      slugShape,
      prerenderLocales
    },
    { getServerSideURL: () => 'https://example.com', ...deps }
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

describe('prerenderLocales', () => {
  it('enumerates only the listed locales', async () => {
    const entries = await exportsFor('single', ['en']).generateStaticParams({ params: { locale: 'de' } })

    expect(new Set(entries.map((entry) => entry.locale))).toEqual(new Set(['en']))
    expect(entries).toContainEqual({ locale: 'en', slug: 'about' })
  })

  it('defaults to every locale', async () => {
    const entries = await params('single')

    expect(new Set(entries.map((entry) => entry.locale))).toEqual(new Set(routing.locales))
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

describe('findDoc', () => {
  const findDoc = (pathname: string, deps: Record<string, unknown> = {}) =>
    exportsFor('catch-all', undefined, deps).generateSitemap.findDoc(pathname)

  it('finds the index document at the root and at a locale prefix', async () => {
    expect(await findDoc('/')).toMatchObject({ doc: { id: 1 }, url: 'https://example.com' })
    expect(await findDoc('/uk')).toMatchObject({ doc: { id: 1 }, url: 'https://example.com/uk' })
  })

  it('finds a document by its localized slug, nested slugs included', async () => {
    expect(await findDoc('/uk/pro-nas')).toMatchObject({ doc: { id: 2 }, url: 'https://example.com/uk/pro-nas' })
    expect(await findDoc('/legal/terms/')).toMatchObject({ doc: { id: 3 } })
  })

  it("misses another locale's slug, the default locale's prefix and unknown paths", async () => {
    expect(await findDoc('/uk/about')).toBeNull()
    expect(await findDoc('/en/about')).toBeNull()
    expect(await findDoc('/missing')).toBeNull()
  })

  it('requires the collection prefix', async () => {
    expect(await findDoc('/about', { pagePathPrefix: 'posts' })).toBeNull()
    expect(await findDoc('/posts/about', { pagePathPrefix: 'posts' })).toMatchObject({ doc: { id: 2 }, url: 'https://example.com/posts/about' })
  })

  it('takes exactly one segment for a [slug] route', async () => {
    const single = exportsFor('single').generateSitemap.findDoc
    expect(await single('/about')).toMatchObject({ doc: { id: 2 } })
    expect(await single('/legal/terms')).toBeNull()
  })
})

describe('suspense', () => {
  const render = (deps: Record<string, unknown>) =>
    exportsFor('catch-all', undefined, deps).default({ params: Promise.resolve({ locale: 'en', slug: ['about'] }) } as never)

  it('wraps the document in a Suspense boundary by default', async () => {
    const element = await render({}) as { type: unknown }
    expect(String(element.type)).toContain('suspense')
  })

  it('renders the document itself with suspense: false', async () => {
    // renderWWWDataModule is mocked to return null
    expect(await render({ suspense: false })).toBeNull()
  })
})
