import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }))
vi.mock('next/root-params', () => ({ locale: undefined }))
vi.mock('next-intl', () => ({ NextIntlClientProvider: () => null }))
vi.mock('next-intl/server', () => ({ setRequestLocale: () => {} }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  }
}))
vi.mock('@justanarthur/payload-plugin-seo/next-metadata', () => ({
  createSiteDefaults: async () => ({}),
  generateMeta: async () => ({})
}))
vi.mock('@justanarthur/payload-plugin-seo/root-jsonld', () => ({ RootJsonLd: () => null }))
vi.mock('../src/render/renderWWWModule', () => ({ renderWWWDataModule: () => null }))

type Doc = { id: number; slugs: Record<string, string | null> }

const docs: Doc[] = [
  { id: 1, slugs: { en: '', sk: '', cs: '' } },
  { id: 2, slugs: { en: 'about', sk: 'o-nas', cs: 'o-nas-cs' } }
]

const find = vi.fn(async ({ locale, where }: { locale: string; where?: { slug?: { equals?: string | null } } }) => {
  const matching = where?.slug ? docs.filter((doc) => (doc.slugs[locale] ?? null) === (where.slug?.equals ?? null)) : docs
  return { docs: matching.map((doc) => ({ id: doc.id, slug: doc.slugs[locale] })), totalDocs: matching.length, page: 1, totalPages: 1 }
})

const findByID = async ({ id, locale }: { id: number; locale: string }) => {
  const doc = docs.find((d) => d.id === id)
  if (!doc) return null
  return { id: doc.id, slug: locale === 'all' ? doc.slugs : doc.slugs[locale] }
}

vi.mock('payload', () => ({
  getPayload: async () => ({
    config: { collections: [], globals: [], custom: { payloadRevalidate: { lists: {}, options: {} } } },
    find,
    findByID
  })
}))

const { createCollectionPageExports } = await import('../src/render/pages/createCollectionPageExports')
const { createRootLayoutExports } = await import('../src/render/pages/createRootLayoutExports')
const { seedPayloadCache } = await import('../src/render/metadata/query')
const { narrowRouting, resolveRouting } = await import('../src/render/pages/utils/resolveRouting')
const { buildLocalizedPath } = await import('../src/render/pages/utils/buildLocalizedPath')
const { linkHref } = await import('../src/render/pages/utils/linkHref')

// the superset every deployment's payload `localization` knows
const routing = { locales: ['en', 'sk', 'cs'], defaultLocale: 'en', localePrefix: 'as-needed' } as never

// this deployment serves sk (its default) and en; cs is off
const resolveLocales = async () => ({ locales: ['sk', 'en'], defaultLocale: 'sk' })

const siteUrl = 'https://example.com'

function pageExports(args: { resolveLocales?: typeof resolveLocales; prerenderLocales?: string[] } = {}) {
  return createCollectionPageExports(
    { _payloadConfig: Promise.resolve({} as never), importMap: {} as never, routing, slugShape: 'catch-all', ...args },
    { getServerSideURL: () => siteUrl }
  )
}

function layoutExports(args: { resolveLocales?: typeof resolveLocales } = {}) {
  return createRootLayoutExports({ _payloadConfig: Promise.resolve({} as never), importMap: {} as never, routing, ...args })
}

const pageProps = (locale: string, slug: string[] = []) => ({ params: Promise.resolve({ locale, slug }) })

beforeAll(() => {
  seedPayloadCache({ config: Promise.resolve({} as never) })
})

describe('narrowRouting', () => {
  it('narrows to the runtime locales and default', () => {
    expect(narrowRouting(routing, { locales: ['sk', 'en'], defaultLocale: 'sk' }))
      .toMatchObject({ locales: ['sk', 'en'], defaultLocale: 'sk', localePrefix: 'as-needed' })
  })

  it('drops locales the static routing does not know, and duplicates', () => {
    expect(narrowRouting(routing, { locales: ['de', 'cs', 'cs'] }).locales).toEqual(['cs'])
  })

  it('falls back to the static default, then the first enabled locale, for a missing or disabled default', () => {
    expect(narrowRouting(routing, { locales: ['sk', 'en'] }).defaultLocale).toBe('en')
    expect(narrowRouting(routing, { locales: ['sk', 'cs'], defaultLocale: 'en' }).defaultLocale).toBe('sk')
  })

  it('keeps the full routing when nothing valid is enabled', () => {
    expect(narrowRouting(routing, null)).toBe(routing)
    expect(narrowRouting(routing, { locales: [] })).toBe(routing)
    expect(narrowRouting(routing, { locales: ['de'] })).toBe(routing)
  })

  it('resolves to the static routing itself without a resolver', async () => {
    expect(await resolveRouting(routing)).toBe(routing)
  })
})

describe('createCollectionPageExports with resolveLocales', () => {
  it('enumerates static params for enabled locales only', async () => {
    const entries = await pageExports({ resolveLocales }).generateStaticParams({ params: {} })

    expect(new Set(entries.map((entry) => entry.locale))).toEqual(new Set(['sk', 'en']))
    expect(entries).toContainEqual({ locale: 'sk', slug: ['o-nas'] })
  })

  it('intersects prerenderLocales with the enabled locales', async () => {
    const entries = await pageExports({ resolveLocales, prerenderLocales: ['cs', 'sk'] }).generateStaticParams({ params: {} })

    expect(new Set(entries.map((entry) => entry.locale))).toEqual(new Set(['sk']))
  })

  it('404s a locale that is known but not enabled', async () => {
    await expect(pageExports({ resolveLocales }).default(pageProps('cs', ['o-nas-cs']))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(pageExports({ resolveLocales }).default(pageProps('sk', ['o-nas']))).resolves.toBeTruthy()
  })

  it('returns no metadata for a disabled locale', async () => {
    expect(await pageExports({ resolveLocales }).generateMetadata(pageProps('cs', ['o-nas-cs']))).toEqual({})
  })

  it('lists only enabled locales in alternates, with the runtime default unprefixed', async () => {
    const { alternates } = await pageExports({ resolveLocales }).generateMetadata(pageProps('en', ['about'])) as {
      alternates: { canonical: string; languages: Record<string, string> }
    }

    expect(alternates.canonical).toBe(`${siteUrl}/en/about`)
    expect(alternates.languages).toEqual({
      sk: `${siteUrl}/o-nas`,
      en: `${siteUrl}/en/about`,
      'x-default': `${siteUrl}/o-nas`
    })
  })

  it('builds the sitemap in the runtime default locale', async () => {
    const sitemap = await pageExports({ resolveLocales }).generateSitemap()

    expect(sitemap.map((entry) => entry.url)).toEqual([siteUrl, `${siteUrl}/o-nas`])
    expect(Object.keys(sitemap[1].alternates?.languages ?? {})).not.toContain('cs')
  })

  it('keeps the full static routing without the option', async () => {
    const entries = await pageExports().generateStaticParams({ params: {} })
    expect(new Set(entries.map((entry) => entry.locale))).toEqual(new Set(['en', 'sk', 'cs']))

    const { alternates } = await pageExports().generateMetadata(pageProps('en', ['about'])) as {
      alternates: { canonical: string; languages: Record<string, string> }
    }
    expect(alternates.canonical).toBe(`${siteUrl}/about`)
    expect(alternates.languages.cs).toBe(`${siteUrl}/cs/o-nas-cs`)
  })
})

describe('createRootLayoutExports with resolveLocales', () => {
  it('generates static params for enabled locales only', async () => {
    expect(await layoutExports({ resolveLocales }).generateStaticParams()).toEqual([{ locale: 'sk' }, { locale: 'en' }])
    expect(await layoutExports().generateStaticParams()).toEqual([{ locale: 'en' }, { locale: 'sk' }, { locale: 'cs' }])
  })

  it('404s a locale that is known but not enabled', async () => {
    const props = { params: Promise.resolve({ locale: 'cs' }), children: null }
    await expect(layoutExports({ resolveLocales }).default(props)).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('buildLocalizedPath under localePrefix: always', () => {
  it('prefixes every locale with a leading slash', () => {
    const always = { locales: ['en', 'sk'], defaultLocale: 'en', localePrefix: 'always' } as never
    expect(buildLocalizedPath('en', undefined, 'about', { routing: always })).toBe('/en/about')
  })
})

describe('linkHref', () => {
  const narrowed = narrowRouting(routing, { locales: ['sk', 'en'], defaultLocale: 'sk' })
  const toPage = (slug: string) => ({ type: 'reference', reference: { relationTo: 'pages', value: { slug } } })

  it('prefixes internal links per routing, leaving the default locale bare', () => {
    expect(linkHref(toPage('o-nas'), { locale: 'sk', routing: narrowed })).toBe('/o-nas')
    expect(linkHref(toPage('about_team'), { locale: 'en', routing: narrowed })).toBe('/en/about/team')
    expect(linkHref(toPage(''), { locale: 'sk', routing: narrowed })).toBe('/')
    expect(linkHref(toPage(''), { locale: 'en', routing: narrowed })).toBe('/en')
  })

  it('mounts a collection under its path prefix', () => {
    const toPost = { type: 'reference', reference: { relationTo: 'posts', value: { slug: 'hello' } } }
    expect(linkHref(toPost, { locale: 'en', routing: narrowed, pagePathPrefixes: { posts: 'posts' } })).toBe('/en/posts/hello')
  })

  it('accepts a single-collection reference and works without routing', () => {
    expect(linkHref({ type: 'reference', reference: { slug: 'about' } })).toBe('/about')
  })

  it('returns custom urls as typed and nothing for an unpopulated reference', () => {
    expect(linkHref({ type: 'custom', url: 'https://x.dev' }, { locale: 'en', routing: narrowed })).toBe('https://x.dev')
    expect(linkHref({ type: 'reference', reference: { relationTo: 'pages', value: 4 } })).toBeUndefined()
    expect(linkHref(undefined)).toBeUndefined()
  })
})
