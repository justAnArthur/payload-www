import 'server-only'
// `next/headers` and next-intl are App-Router-only. Imported lazily
// in the function body so a server entrypoint that calls
// `createWWWConfig` doesn't pull this module into its static graph
// at module-init time.
//
// The live-preview listener is also handled without a static
// `'use client'` import. The lib exposes a tiny provider hook
// (`setImportMapProvider` in `../importMapProvider`) the host wires
// up once in `payload.config.ts`; `createCollectionPageExports`
// reads the importMap at request time through `getImportMap` and
// renders the listener (with a Suspense fallback) when Next.js
// draft mode is on. Hosts get live preview automatically — no
// opt-in required, and the page files never need to know about
// `importMap` directly.

import type { Metadata, MetadataRoute } from 'next'
import type { DataFromCollectionSlug, ImportMap, SanitizedConfig } from 'payload'
import * as React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Suspense } from 'react'

import { RenderBlocks } from '../blocks/renderBlocks'
import { LIVE_PREVIEW_LISTENER_PATH, PAGES_RENDER_PATH, POSTS_RENDER_PATH, POSTS_SLUG } from '../../config/constants'
import { renderCollectionModule } from '../utils/renderCollectionModule'
import { buildHreflangAlternates, type HreflangAlternates } from '../metadata/hreflang'
import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd
} from '../metadata/jsonld'
import { getUrlPath, segmentsToStoredSlug, storedSlugToSegments } from '../metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDocBySlug } from '../metadata/query'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getImportMap } from '../../exports/import-map-provider'

// --- types ---

export type PageExtendProps = { importMap: ImportMap; config: SanitizedConfig; locale: string }

export type ArticleJsonLdEntry = {
  type: 'article'
  id?: string
  schemaType?: 'BlogPosting' | 'Article' | 'NewsArticle' | 'TechArticle'
  publisherName?: string
  publisherLogo?: string | null
}

export type WebSiteJsonLdEntry = {
  type: 'website'
  id?: string
  name?: string
  alternateName?: string
}

export type OrganizationJsonLdEntry = {
  type: 'organization'
  id?: string
  name?: string
  logo?: string
  sameAs?: string[]
}

export type BreadcrumbsJsonLdEntry = {
  type: 'breadcrumbs'
  id?: string
  items?: BreadcrumbItem[]
  buildItems?: (doc: DataFromCollectionSlug<string>, url: string) => BreadcrumbItem[]
}

export type CustomJsonLdEntry = {
  type: 'custom'
  id?: string
  build: (ctx: {
    doc: DataFromCollectionSlug<string>
    url: string
    locale: string
    siteUrl: string
  }) => Record<string, unknown>
}

export type JsonLdEntry =
  | ArticleJsonLdEntry
  | WebSiteJsonLdEntry
  | OrganizationJsonLdEntry
  | BreadcrumbsJsonLdEntry
  | CustomJsonLdEntry

export type JsonLdOutput = { id: string; schema: Record<string, unknown> }

/**
 * Minimal next-intl routing contract the lib reads. Hosts pass
 * their `defineRouting({...})` result directly; the lib only needs
 * the shape below.
 *
 * `localePrefix` accepts either the simple string form
 * (`'always' | 'as-needed' | 'never'`) or next-intl's verbose
 * `LocalePrefixConfigVerbose` shape (`{ mode, prefixes? }`). The lib
 * normalizes both to a string `mode` internally.
 */
export type LocalePrefixValue = 'always' | 'as-needed' | 'never' | { mode?: 'always' | 'as-needed' | 'never' }

export type PageRouting = {
  locales: readonly string[]
  defaultLocale: string
  localePrefix?: LocalePrefixValue
  /** Optional human-readable labels per locale (used by the
   * `<LocaleSwitcher>`). Falls back to the locale code when missing.
   * Not part of next-intl's `defineRouting` shape — the host extends
   * its routing object to include it (e.g. via a type assertion). */
  labels?: Record<string, string>
}

export type MetadataOptions = {
  urlPrefix?: string
  /** When true (default), the lib generates a `{type:'website'}` JSON-LD
   * entry per page. Pass an array to specify entries; pass `false` to
   * skip. */
  jsonLd?: boolean | JsonLdEntry[]
  changefreq?: MetadataRoute.Sitemap[number]['changeFrequency']
  priority?: number
  /**
   * Override the default `'website'` JSON-LD's `name` field. Only
   * relevant when `jsonLd !== false` and no `name` is set on the
   * auto-generated entry.
   */
  websiteName?: string
}

export type ShowcaseOptions = {
  /**
   * Wrap the rendered page in a two-column layout with a sidebar
   * that surfaces the page's metadata, JSON-LD, and a language
   * switcher. Hosts that want a clean render (no sidebar) leave
   * this `false` (the default). The demo's home page enables it
   * so visitors can see every artifact the lib generates in one
   * place.
   */
  enabled?: boolean
  /** Heading shown above the metadata block. Default: `'Page metadata'`. */
  metadataHeading?: string
  /** Heading shown above the JSON-LD block. Default: `'JSON-LD'`. */
  jsonLdHeading?: string
}

export type CreateCollectionPageExportsArgs<S extends string = 'pages'> = {
  config: Promise<SanitizedConfig>
  /**
   * Defaults to `'pages'`. The collection slug whose documents the
   * page route renders.
   */
  slug?: S
  /**
   * The next-intl `defineRouting({...})` result from the host's
   * `i18n/routing.ts`. Drives locale validation, URL building,
   * hreflang alternates, and the language switcher.
   */
  routing: PageRouting
  /**
   * Optional custom path pointing at the host's render module for
   * the collection. Overrides the lib's registered `custom.path`
   * (which defaults to `PAGES_RENDER_PATH`). Use this when you've
   * defined your own Server Component for the collection.
   */
  renderPath?: string
}

export type CreateCollectionPageExportsDeps<S extends string> = {
  /**
   * Host's `getServerSideURL()` (returns the absolute site URL).
   */
  getServerSideURL: () => string
  /**
   * Host's `generateMeta({ doc, url, type, locale })` (returns Next.js
   * `Metadata`). The `doc` is the host's typed collection document
   * (e.g. `Post` for the posts collection, `Page` for pages) with
   * localized fields already resolved for the active locale. Read
   * `doc.title` directly as a string — no locale-lookup needed.
   */
  generateMeta: (args: {
    doc: DataFromCollectionSlug<S> | null
    url: string
    type: 'website' | 'article'
    locale: string
  }) => Promise<Metadata>
  /**
   * When `true` (default), the route page renders a 404 for unknown
   * slugs. Set `false` to render an empty page.
   */
  notFoundOnMissing?: boolean
  /**
   * Override the metadata type passed to `generateMeta` and the
   * JSON-LD entry default. Defaults to `'article'` for the
   * `posts` collection, `'website'` everywhere else. Hosts that
   * want to opt out (e.g. treat a Post like a WebPage) pass
   * `'website'` explicitly here.
   */
  metadataType?: 'website' | 'article'
  /**
   * Optional showcase configuration. When `enabled: true`, the
   * default page renders inside a `<PageShowcase>` sidebar that
   * surfaces the page's metadata, JSON-LD, and a language
   * switcher — useful for demos and CMS previews. Default: off.
   */
  showcase?: ShowcaseOptions
  /**
   * Optional content injected after the rendered doc body when the
   * page is the home route (slug = `''`). The lib calls the
   * function with the resolved locale and the current doc (or
   * `null` if no home doc exists). Hosts that want the home to
   * surface additional content — recent pages, recent posts,
   * navigation — pass a function here. The return value is
   * rendered as a sibling of the lib's doc body inside the page
   * (and inside the showcase's main column when showcase is on).
   */
  homeExtras?: (args: { locale: string; doc: DataFromCollectionSlug<S> | null }) => ReactNode | Promise<ReactNode>
}

const HOME_SLUG = ''

/**
 * Build a Pages (or any collection) page route's exports:
 * `default` (the Page Server Component), `generateMetadata`,
 * `generateStaticParams`, and `generateSitemap`.
 *
 * Designed for a next-intl layout: the page lives at
 * `app/(frontend)/[locale]/[...slug]/page.tsx`. The catch-all slug
 * handles both the home route (slug=[]) and any other doc. The lib
 * reads `params.locale` and `params.slug` (string[]), validates
 * the locale against `routing.locales`, fetches the doc, generates
 * metadata + JSON-LD + hreflang alternates, and renders the
 * resolved output.
 *
 * The host's `next-intl/routing` config is the single source of
 * truth for the locale list and URL shape.
 *
 *   // app/(frontend)/[locale]/[...slug]/page.tsx
 *   import { routing } from '@/i18n/routing'
 *   import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
 *
 *   const { default: Page, generateMetadata, generateStaticParams } =
 *     createCollectionPageExports(
 *       { config: configPromise, routing },
 *       { getServerSideURL, generateMeta, showcase: { enabled: true } }
 *     )
 *
 *   export { generateMetadata, generateStaticParams }
 *   export default Page
 */
export function createCollectionPageExports<S extends string = 'pages'>(
  {
    slug = 'pages' as S,
    config: configPromise,
    routing,
    renderPath
  }: CreateCollectionPageExportsArgs<S>,
  deps: CreateCollectionPageExportsDeps<S>,
  options: MetadataOptions = {}
) {
  const { jsonLd: jsonLdOption = true, changefreq = 'weekly', priority = 0.5, websiteName } = options
  const {
    getServerSideURL,
    generateMeta,
    notFoundOnMissing = true,
    metadataType: metadataTypeOverride,
    showcase: showcaseOption,
    homeExtras
  } = deps
  const showcaseEnabled = showcaseOption?.enabled === true
  const { metadataHeading, jsonLdHeading } = showcaseOption ?? {}

  const locales = routing.locales
  const defaultLocale = routing.defaultLocale
  // The `posts` collection is article-shaped (title + excerpt +
  // Lexical content + a publishedAt), so the lib defaults its
  // metadata type to `'article'` and its JSON-LD default to a
  // BlogPosting entry. Hosts can override via `deps.metadataType`
  // or `options.jsonLd`.
  const metadataType: 'website' | 'article' =
    metadataTypeOverride ?? (slug === POSTS_SLUG ? 'article' : 'website')
  // Default render path: per-collection. The lib's `Pages` and
  // `Posts` collections each ship a default Server Component
  // (registered in `createWWWConfig`'s importMap) — picks the right
  // one here so hosts don't need to pass `renderPath` for the
  // standard cases.
  const defaultRenderPath = slug === POSTS_SLUG ? POSTS_RENDER_PATH : PAGES_RENDER_PATH
  // Normalize next-intl's verbose `{ mode, prefixes? }` shape to
  // the simple string form the URL builder compares against.
  const localePrefixMode: 'always' | 'as-needed' | 'never' =
    typeof routing.localePrefix === 'string'
      ? routing.localePrefix
      : (routing.localePrefix as { mode?: 'always' | 'as-needed' | 'never' } | undefined)?.mode ?? 'always'

  /** Build the locale-prefixed URL for a slug in a given locale. */
  const buildLocalePath = (locale: string, storedSlug: string): string => {
    const urlPath = getUrlPath(storedSlug, false, HOME_SLUG)
    if (localePrefixMode === 'never') return urlPath
    if (localePrefixMode === 'as-needed' && locale === defaultLocale) return urlPath
    return `/${locale}${urlPath}`
  }

  async function fetchDoc(locale: string, storedSlug: string) {
    return queryDocBySlug({
      collectionSlug: slug,
      slug: storedSlug,
      slugField: 'slug',
      locale,
      draft: true,
      config: configPromise
    })
  }

  async function resolveHreflangAlternates(
    locale: string,
    storedSlug: string
  ): Promise<{ alternates: HreflangAlternates; canonical: string }> {
    const siteUrl = getServerSideURL()
    const urlPath = buildLocalePath(locale, storedSlug)
    const canonical = `${siteUrl}${urlPath}`
    const languages = await buildHreflangAlternates({
      siteUrl,
      locale,
      urlPrefix: '',
      storedSlug,
      nested: false,
      homeSlug: HOME_SLUG,
      defaultLocale,
      locales,
      queryAllLocaleSlugs: (s, l) =>
        queryAllLocaleSlugs({ collectionSlug: slug, slug: s, slugField: 'slug', locale: l, config: configPromise })
    })
    // The hreflang helper builds URLs as `${siteUrl}/${locale}${urlPath}`,
    // which matches `buildLocalePath` exactly. Translate to next-intl
    // shape (canonical + languages).
    const alternates: HreflangAlternates = {}
    for (const [key, url] of Object.entries(languages)) {
      alternates[key] = url
    }
    return { alternates, canonical }
  }

  const default_ = async (props: {
    params: Promise<{ locale?: string; slug?: string[] }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }): Promise<ReactElement> => {
    const { draftMode } = await import('next/headers')
    const { slug: rawSlugSegments, locale: incomingLocale } = (await props.params) ?? {}
    const slugSegments: string[] = Array.isArray(rawSlugSegments) ? rawSlugSegments : []
    const locale = typeof incomingLocale === 'string' ? incomingLocale : defaultLocale
    if (!locales.includes(locale)) {
      const { notFound } = await import('next/navigation')
      notFound()
    }

    // next-intl's setRequestLocale is required for `next-intl` server
    // APIs in async components (translations, date-fns locale, etc.).
    const { setRequestLocale } = await import('next-intl/server')
    setRequestLocale(locale)

    const storedSlug = segmentsToStoredSlug(slugSegments, false)
    const doc = await fetchDoc(locale, storedSlug)

    if (!doc && notFoundOnMissing) {
      const { notFound } = await import('next/navigation')
      notFound()
    }

    const { isEnabled: draft } = await draftMode()
    const cfg = await configPromise
    const importMap = await getImportMap()
    const collectionCustomPath = cfg.collections.find((c) => c.slug === slug)?.custom?.path
    const effectivePath = renderPath ?? collectionCustomPath ?? defaultRenderPath

    const render =
      effectivePath === PAGES_RENDER_PATH
        ? doc
          ? <RenderBlocks
              blocks={
                ((doc as DataFromCollectionSlug<S> & { blocks?: Array<{ blockType: string } & Record<string, unknown>> })
                  .blocks ?? []) as Array<{ blockType: string } & Record<string, unknown>>
              }
              importMap={importMap}
              config={cfg}
              locale={locale}
            />
          : null
        : effectivePath === POSTS_RENDER_PATH
          ? doc
            ? await renderPostBody(doc as DataFromCollectionSlug<S>, locale)
            : null
          : renderCollectionModule(cfg.collections, slug, importMap, {
              ...props,
              config: cfg,
              locale,
              searchParams: props.searchParams,
              doc
            })

    const jsonLdNodes = doc ? await generateJsonLd(slugSegments, doc, locale) : []
    const { alternates: hreflangAlternates, canonical } = await resolveHreflangAlternates(locale, storedSlug)

    const inner = (
      <>
        {jsonLdNodes.map(({ id, schema }) => (
          <script
            key={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        {render}
        {draft
          ? (() => {
              const ResolvedListener = importMap?.[LIVE_PREVIEW_LISTENER_PATH] as
                | React.ComponentType
                | undefined
              if (!ResolvedListener) return null
              return (
                <Suspense fallback={null}>
                  <ResolvedListener />
                </Suspense>
              )
            })()
          : null}
        {storedSlug === HOME_SLUG && homeExtras
          ? await homeExtras({ locale, doc: doc as DataFromCollectionSlug<S> | null })
          : null}
      </>
    )

    if (!showcaseEnabled || !doc) return inner

    // Showcase mode: wrap the inner render in a sidebar layout that
    // surfaces the page's metadata, JSON-LD, and language switcher.
    const { PageShowcase } = await import('../components/PageShowcase')
    const { LocaleSwitcher } = await import('../components/LocaleSwitcher')
    const meta = await generateMeta({ doc: doc as DataFromCollectionSlug<S>, url: canonical, type: metadataType, locale })
    return (
      <PageShowcase
        metadata={meta}
        metadataHeading={metadataHeading}
        jsonLdHeading={jsonLdHeading}
        jsonLd={jsonLdNodes}
        localeSwitcher={
          <LocaleSwitcher
            currentLocale={locale}
            hreflangAlternates={hreflangAlternates}
            labels={routing.labels}
          />
        }
      >
        {inner}
      </PageShowcase>
    )
  }

  async function generateMetadata(props: {
    params: Promise<{ locale?: string; slug?: string[] }>
  }): Promise<Metadata> {
    const cfg = await configPromise
    const { slug: rawSlugSegments, locale: incomingLocale } = (await props.params) ?? {}
    const slugSegments: string[] = Array.isArray(rawSlugSegments) ? rawSlugSegments : []
    const locale = typeof incomingLocale === 'string' ? incomingLocale : defaultLocale
    if (!locales.includes(locale)) return { title: 'Not found', robots: { index: false, follow: false } }

    const storedSlug = segmentsToStoredSlug(slugSegments, false)
    const doc = await fetchDoc(locale, storedSlug)

    if (!doc) return { title: 'Not found', robots: { index: false, follow: false } }

    const collection = cfg.collections.find((c) => c.slug === slug)
    if (!collection) return {}

    const { canonical, alternates } = await resolveHreflangAlternates(locale, storedSlug)
    const meta = await generateMeta({
      doc: doc as DataFromCollectionSlug<S>,
      url: canonical,
      type: metadataType,
      locale
    })

    meta.alternates = {
      canonical,
      languages: Object.keys(alternates).length ? alternates : undefined
    }

    return meta
  }

  async function generateJsonLd(
    slugSegments: string[],
    doc: DataFromCollectionSlug<S>,
    locale: string
  ): Promise<JsonLdOutput[]> {
    if (jsonLdOption === false || !doc) return []
    const siteUrl = getServerSideURL()
    const storedSlug = segmentsToStoredSlug(slugSegments, false)
    const urlPath = buildLocalePath(locale, storedSlug)
    const canonical = `${siteUrl}${urlPath}`

    const entries: JsonLdEntry[] = Array.isArray(jsonLdOption)
      ? jsonLdOption
      : metadataType === 'article'
        ? [{ type: 'article' }]
        : [{ type: 'website' }]

    const outputs: JsonLdOutput[] = []
    for (const entry of entries) {
      const id = entry.id ?? `jsonld-${entry.type}-${outputs.length}`
      let schema: Record<string, unknown> | null = null

      switch (entry.type) {
        case 'article': {
          const articleOpts: ArticleLdOptions = {
            doc: doc as DataFromCollectionSlug<string>,
            url: canonical,
            locale,
            siteUrl,
            type: entry.schemaType ?? 'BlogPosting'
          }
          if (entry.publisherName !== undefined) articleOpts.publisherName = entry.publisherName
          if (entry.publisherLogo !== undefined) articleOpts.publisherLogo = entry.publisherLogo
          schema = buildArticleLd(articleOpts)
          break
        }
        case 'website': {
          schema = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${siteUrl}#website`,
            url: siteUrl,
            name: entry.name ?? websiteName ?? new URL(siteUrl).hostname,
            ...(entry.alternateName ? { alternateName: entry.alternateName } : {}),
            inLanguage: locale
          }
          break
        }
        case 'organization': {
          schema = buildOrganizationLd({
            siteUrl,
            name: entry.name,
            logo: entry.logo,
            sameAs: entry.sameAs
          })
          break
        }
        case 'breadcrumbs': {
          let items: BreadcrumbItem[] = entry.items ?? []
          if (!items.length && entry.buildItems) items = entry.buildItems(doc as DataFromCollectionSlug<string>, canonical)
          if (items.length > 0) schema = buildBreadcrumbsLd({ items, currentUrl: canonical })
          break
        }
        case 'custom': {
          schema = entry.build({ doc: doc as DataFromCollectionSlug<string>, url: canonical, locale, siteUrl })
          break
        }
      }

      if (schema) outputs.push({ id, schema })
    }

    return outputs
  }

  async function generateStaticParams() {
    const params: Array<{ slug?: string[]; locale: string }> = []
    for (const locale of locales) {
      const docs = await queryAllDocs({ collectionSlug: slug, slugField: 'slug', locale, config: configPromise })
      for (const doc of docs) {
        const slugVal = (doc as DataFromCollectionSlug<S> & { slug?: string }).slug
        if (typeof slugVal !== 'string' || slugVal === '') continue
        const segments = storedSlugToSegments(slugVal, false)
        params.push({ slug: Array.isArray(segments) ? segments : [segments], locale })
      }
    }
    return params
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const docs = await queryAllDocs({ collectionSlug: slug, slugField: 'slug', locale: defaultLocale, config: configPromise })
    const siteUrl = getServerSideURL().replace(/\/$/, '')
    const urls: MetadataRoute.Sitemap = []
    for (const doc of docs) {
      const slugVal = (doc as DataFromCollectionSlug<S> & { slug?: string }).slug
      if (typeof slugVal !== 'string' || slugVal === '') continue
      for (const locale of locales) {
        const urlPath = buildLocalePath(locale, slugVal)
        const updatedAt = (doc as unknown as { updatedAt?: unknown }).updatedAt
        const lastmod = typeof updatedAt === 'string' ? new Date(updatedAt).toISOString() : undefined
        urls.push({ url: `${siteUrl}${urlPath}`, lastModified: lastmod, changeFrequency: changefreq, priority })
      }
    }
    return urls
  }

  return {
    default: default_,
    generateMetadata,
    generateStaticParams,
    generateSitemap,
    generateJsonLd
  } as {
    default: (props: {
      params: Promise<{ locale?: string; slug?: string[] }>
      searchParams?: Promise<Record<string, string | string[] | undefined>>
    }) => Promise<ReactElement>
    generateMetadata: (props: { params: Promise<{ locale?: string; slug?: string[] }> }) => Promise<Metadata>
    generateStaticParams: () => Promise<Array<{ slug?: string[]; locale: string }>>
    generateSitemap: () => Promise<MetadataRoute.Sitemap>
    generateJsonLd: (
      slugSegments: string[],
      doc: DataFromCollectionSlug<S>,
      locale: string
    ) => Promise<JsonLdOutput[]>
  }
}

export function addCollectionsToSitemap(
  exports: Array<{
    default: () => Promise<MetadataRoute.Sitemap>
    generateSitemap: () => Promise<MetadataRoute.Sitemap>
  }>
) {
  async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
    const all = await Promise.all(exports.map((e) => e.generateSitemap()))
    return all.flat()
  }
  return { default: buildSitemap, generateSitemap: buildSitemap }
}

/**
 * Default body renderer for the lib's `posts` collection
 * (`POSTS_RENDER_PATH`). Mirrors the public `<PostsPage>`
 * component so the lib's runtime page factory can inline the
 * render without an extra async hop.
 *
 * Renders `title`, optional `excerpt`, and Lexical `content`
 * via Payload's server-renderable `<RichText>`. Localized fields
 * are already resolved for the active locale by the time the doc
 * reaches this renderer — read `doc.title` directly as a string.
 */
async function renderPostBody<S extends string>(
  doc: DataFromCollectionSlug<S>,
  locale: string
): Promise<ReactElement> {
  const typedDoc = doc as DataFromCollectionSlug<S> & {
    title?: string
    excerpt?: string | null
    content?: Parameters<typeof RichText>[0]['data']
  }
  const title = typedDoc.title ?? ''
  const excerpt = typedDoc.excerpt ?? null
  const content = typedDoc.content

  return (
    <article className="posts-page prose prose-neutral dark:prose-invert mx-auto max-w-3xl py-10">
      <header className="posts-page__header not-prose mb-8">
        <h1 className="posts-page__title text-4xl font-semibold tracking-tight">{title}</h1>
        {excerpt ? (
          <p className="posts-page__excerpt mt-3 text-lg text-muted-foreground">{excerpt}</p>
        ) : null}
      </header>
      {content ? (
        <div className="posts-page__content">
          <RichText data={content} />
        </div>
      ) : null}
    </article>
  )
}
