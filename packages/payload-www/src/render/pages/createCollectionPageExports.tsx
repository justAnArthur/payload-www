import type { Metadata, MetadataRoute } from 'next'
import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactNode } from 'react'
import * as React from 'react'
import { isIndexSlug, paramsSlugToSlug, shapeHasIndexPath, type SlugShape, slugToParamsSlug } from '../metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDoc, RENDER_DEPTH, seedPayloadCache } from '../metadata/query'
import { setRequestLocale } from "next-intl/server"
import { type GenerateStaticParamsProps, NextPageProps } from "./utils/checkParams"
import { buildAlternates, type PagePathPrefix, resolvePagePathPrefix, RoutingConfig } from "./utils/buildLocalizedPath"
import { createSiteDefaults, generateMeta } from "@justanarthur/payload-plugin-seo/next-metadata"
import { renderWWWDataModule } from "../renderWWWModule"
import { type ResolveLocales, resolveRouting } from "./utils/resolveRouting"

export type CreateCollectionPageExportsArgs<S extends string = 'pages'> = {
  slug?: S

  _payloadConfig: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig

  slugShape?: SlugShape

  /** Relationship / upload hops populated on the rendered document. `0` renders them as bare ids. */
  depth?: number

  /** Locales whose documents prerender at build. The rest render on their first request and cache from there. Defaults to every locale. */
  prerenderLocales?: string[]

  /**
   * Narrows `routing` to the locales this deployment serves, read at runtime (e.g. from a settings
   * global). Locales outside the result 404 and drop out of static params, alternates and the
   * sitemap; its default locale gets no prefix under `localePrefix: 'as-needed'`. Omit to serve
   * every locale of `routing`.
   */
  resolveLocales?: ResolveLocales
}

export type CreateCollectionPageExportsDeps<S extends string> = {
  getServerSideURL: () => string
  pagePathPrefix?: PagePathPrefix

  /** Rendered while the document streams. Defaults to nothing. Ignored with `suspense: false`. */
  fallback?: ReactNode

  /**
   * Wraps the document in a `<Suspense>` boundary so the layout streams first. Default `true`.
   * A boundary that resolves after the shell is flushed lands at the end of the HTML, after the
   * layout's footer, so crawlers and assistants reading the raw HTML see the footer's headings
   * before the page's `<h1>`. Turn it off when the documents prerender (nothing in them reads
   * request data outside a boundary of its own): the page then renders in document order.
   */
  suspense?: boolean
}

export type CollectionDocEntry = {
  doc: Record<string, any>
  /** Absolute canonical URL in the listed locale. */
  url: string
  alternates: { languages: Record<string, string>; canonical: string }
  lastModified: string | Date
}

export function createCollectionPageExports<S extends string = 'pages'>(
  {
    slug: collectionSlug = 'pages' as S,

    _payloadConfig,
    importMap,

    routing,
    slugShape = 'single',
    depth = RENDER_DEPTH,
    prerenderLocales,
    resolveLocales
  }: CreateCollectionPageExportsArgs<S>,
  {
    getServerSideURL,
    pagePathPrefix,
    fallback,
    suspense = true
  }: CreateCollectionPageExportsDeps<S>
) {
  seedPayloadCache({ config: _payloadConfig })

  const siteUrl = getServerSideURL()

  const getRouting = () => resolveRouting(routing, resolveLocales)

  async function fetchDoc(locale: string, slug: string) {
    return queryDoc({
      slug,
      locale,
      depth,

      collectionSlug
    })
  }

  // notFound() has to run before the suspense boundary: once the shell streams, the status is already 200
  const default_ = async (props: NextPageProps): Promise<ReactNode> => {
    const params = await props.params

    const locale = params.locale as string
    const routing = await getRouting()
    if (!routing.locales.includes(locale)) {
      const { notFound } = await import('next/navigation')
      return notFound()
    } else
      setRequestLocale(locale)

    const slug = paramsSlugToSlug(params.slug, slugShape)

    const doc = await fetchDoc(locale, slug)
    if (!doc) {
      const { notFound } = await import('next/navigation')
      notFound()
    }

    const rendered = renderWWWDataModule(
      doc, { collectionSlug, config: _payloadConfig, importMap }, { ...props, locale, routing }
    )

    if (!suspense) return rendered

    return <React.Suspense fallback={fallback ?? null}>
      {rendered}
    </React.Suspense>
  }

  async function generateMetadata(props: NextPageProps): Promise<Metadata> {
    const params = await props.params

    const locale = params.locale as string
    const routing = await getRouting()
    if (!routing.locales.includes(locale)) {
      return {}
    }

    const slug = paramsSlugToSlug(params.slug, slugShape)

    const doc = await fetchDoc(locale, slug)

    const [localesSlug, siteDefaults] = await Promise.all([
      doc
        ? queryAllLocaleSlugs({
          id: doc.id,
          collectionSlug
        })
        : Promise.resolve({} as Record<string, string> | null),
      createSiteDefaults({ config: _payloadConfig, locale })
    ])

    if (!doc) return {}

    const alternates = buildAlternates(locale, localesSlug ?? {}, pagePathPrefix, { routing, siteUrl })

    const meta = await generateMeta({
      meta: doc.meta,
      url: alternates.canonical,
      type: 'website',
      locale,
      availableLocales: routing.locales,
      fallback: doc,
      siteDefaults
    })

    return { ...meta, alternates }
  }

  async function generateStaticParams(props: GenerateStaticParamsProps) {
    await props.params
    const { locales } = await getRouting()
    // Return every (locale, slug) pair across the prerendered locales. Next 16's
    // static shell pre-renders each pair; the layout's generateStaticParams
    // already supplies the per-locale fan-out, but listing the pairs here too
    // keeps the static shell self-describing if the layout ever drops the
    // locale fan-out. next calls this once per layout locale and needs a
    // non-empty result each time, so it returns the same pairs regardless.
    const perLocaleEntries = await Promise.all(
      (prerenderLocales?.filter(locale => locales.includes(locale)) ?? locales).map(async (locale) => {
        const docs = await queryAllDocs({ locale, collectionSlug })

        const entries = docs
          .filter(doc => !isIndexSlug(doc.slug))
          .map(doc => ({ locale, slug: slugToParamsSlug(doc.slug, slugShape) }))

        // the index document is addressed by the locale prefix alone, so only a shape whose
        // segment may be absent has a path for it. asking fetchDoc rather than picking from
        // `docs` keeps the enumerated entry to one per locale and to the document a request
        // for that path would actually be served.
        if (shapeHasIndexPath(slugShape) && await fetchDoc(locale, ''))
          entries.push({ locale, slug: slugToParamsSlug('', slugShape) })

        return entries
      })
    )
    return perLocaleEntries.flat()
  }

  /**
   * Every published document of the collection with its canonical URL in `locale` (the served
   * default when omitted). Outside the default locale, documents without a slug of their own in
   * that locale are left out, since they have no page there. Shared by the sitemap and llms.txt.
   */
  async function listDocs(locale?: string): Promise<CollectionDocEntry[]> {
    const routing = await getRouting()
    const docLocale = locale ?? routing.defaultLocale
    if (!routing.locales.includes(docLocale)) return []

    const docs = await queryAllDocs({
      collectionSlug,
      locale: docLocale
    })

    const entries = await Promise.all(docs.map(async doc => {
      const localesSlug = (await queryAllLocaleSlugs({
        id: doc.id,
        collectionSlug
      })) ?? {}

      const alternates = buildAlternates(docLocale, localesSlug, pagePathPrefix, { routing, siteUrl })
      if (docLocale !== routing.defaultLocale && !(docLocale in alternates.languages)) return null

      return ({
        doc: doc as Record<string, any>,
        url: alternates.canonical,
        alternates,
        lastModified: doc.updatedAt || new Date()
      })
    }))

    return entries.filter(entry => entry !== null)
  }

  /**
   * The published document served at `pathname` (`/sk/o-nas`, `/posts/hello`), at render depth,
   * with its canonical URL; `null` when the path is no document's canonical URL in this
   * collection. One lookup by slug, so it is cheap enough for a request handler.
   */
  async function findDoc(pathname: string): Promise<CollectionDocEntry | null> {
    const routing = await getRouting()
    let segments: string[]
    try {
      segments = pathname.split('/').filter(Boolean).map(decodeURIComponent)
    } catch {
      return null
    }

    const locale = routing.localePrefix !== 'never' && routing.locales.includes(segments[0])
      ? segments.shift()!
      : routing.defaultLocale

    const prefix = resolvePagePathPrefix(pagePathPrefix, locale, routing)?.split('/').filter(Boolean) ?? []
    if (prefix.some((part, i) => segments[i] !== part)) return null
    segments.splice(0, prefix.length)
    if (slugShape === 'single' && segments.length !== 1) return null

    const doc = await fetchDoc(locale, paramsSlugToSlug(segments, slugShape))
    if (!doc) return null

    const localesSlug = (await queryAllLocaleSlugs({ id: doc.id, collectionSlug })) ?? {}
    const alternates = buildAlternates(locale, localesSlug, pagePathPrefix, { routing, siteUrl })
    if (locale !== routing.defaultLocale && !(locale in alternates.languages)) return null
    // another locale's slug (/sk/about) or a non-canonical form (/en/x under as-needed) is not
    // this document's URL: the page itself redirects those
    const trim = (path: string) => path.replace(/\/+$/, '') || '/'
    if (trim(new URL(alternates.canonical).pathname) !== trim(pathname)) return null

    return { doc: doc as Record<string, any>, url: alternates.canonical, alternates, lastModified: doc.updatedAt || new Date() }
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    return (await listDocs()).map(({ url, alternates, lastModified }) => ({ url, alternates, lastModified }))
  }

  generateSitemap.getServerSideURL = getServerSideURL
  // the sitemap index addresses a route, not a localized page, so it stays on one segment
  generateSitemap.pagePathPrefix = resolvePagePathPrefix(pagePathPrefix, routing.defaultLocale, routing)
  // what createLlmsTxtFromCollections reads; riding on generateSitemap lets a host hand the same
  // functions to the sitemap index and to llms.txt without new page exports
  generateSitemap.collectionSlug = collectionSlug as string
  generateSitemap.payloadConfig = _payloadConfig
  generateSitemap.getRouting = getRouting
  generateSitemap.listDocs = listDocs
  // what createMarkdownFromCollections reads: the path lookup and the localized segment its links use
  generateSitemap.findDoc = findDoc
  generateSitemap.pathPrefix = pagePathPrefix

  return ({
    default: default_,
    // noinspection JSUnusedProperty — Next.js's page module runtime reads
    // `generateMetadata` off the exported object; TS / JetBrains can't see it.
    generateMetadata,
    generateStaticParams,
    generateSitemap
  })
}

type GenerateSitemapPageExportsArgs = CreateCollectionPageExportsDeps<any>

export function createSitemapFromCollections(...args: GenerateSitemapPageExportsArgs[]) {
  const baseUrl = args[0].getServerSideURL()

  return function sitemap() {
    const sitemaps = args.map(arg =>
      `${baseUrl}/${arg.pagePathPrefix}/sitemap.xml`
    )
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((url) => `  <sitemap><loc>${url}</loc></sitemap>`).join('\n')}
</sitemapindex>`

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' }
    })
  }
}
