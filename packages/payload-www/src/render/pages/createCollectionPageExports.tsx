import 'server-only'
// `next/headers` is App-Router-only. Imported lazily in the `default_`
// body so a server entrypoint that calls `createWWWConfig` doesn't
// pull this module into its static graph at module-init time.
//
// This file is server-only by design: it never top-level-imports
// the lib's `LivePreviewListener` (a 'use client' component). The
// listener is resolved at request time through the importMap (the
// same mechanism the lib uses to resolve the Pages collection's
// `custom.path` render). The lib's `withWWWConfig` registers the
// listener under `LIVE_PREVIEW_LISTENER_PATH` in `admin.dependencies`,
// so the importMap statically imports the lib's
// `/render-components` shim and exposes the listener as a value.
// `createCollectionPageExports` reads that value from the importMap
// and renders it (with a Suspense fallback) whenever Next.js draft
// mode is on. Hosts get live preview automatically — no opt-in
// required, and the server entry stays free of `'use client'`
// imports.

import type { Metadata, MetadataRoute } from 'next'
import type { ImportMap, SanitizedConfig } from 'payload'
import * as React from 'react'
import type { ReactElement } from 'react'
import { Suspense } from 'react'

import { RenderBlocks } from '../blocks/renderBlocks'
import { LIVE_PREVIEW_LISTENER_PATH } from '../../config/constants'
import { renderCollectionModule } from '../utils/renderCollectionModule'
import { buildHreflangAlternates } from '../metadata/hreflang'
import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd
} from '../metadata/jsonld'
import { getUrlPath, segmentsToStoredSlug, storedSlugToSegments } from '../metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDocBySlug } from '../metadata/query'
import { PAGES_RENDER_PATH } from '../../config/createWWWConfig'

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
  buildItems?: (doc: Record<string, any>, url: string) => BreadcrumbItem[]
}

export type CustomJsonLdEntry = {
  type: 'custom'
  id?: string
  build: (ctx: { doc: Record<string, any>; url: string; locale: string; siteUrl: string }) => Record<string, unknown>
}

export type JsonLdEntry =
  | ArticleJsonLdEntry
  | WebSiteJsonLdEntry
  | OrganizationJsonLdEntry
  | BreadcrumbsJsonLdEntry
  | CustomJsonLdEntry

export type JsonLdOutput = { id: string; schema: Record<string, unknown> }

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

export type CreateCollectionPageExportsArgs = {
  config: Promise<SanitizedConfig>
  /**
   * Defaults to `'pages'`. The collection slug whose documents the
   * page route renders.
   */
  slug?: string
  importMap: ImportMap
  /**
   * Optional custom path pointing at the host's render module for
   * the collection. Overrides the lib's registered `custom.path`
   * (which defaults to `PAGES_RENDER_PATH`). Use this when you've
   * defined your own Server Component for the collection.
   */
  renderPath?: string
}

export type CreateCollectionPageExportsDeps = {
  /**
   * Host's `getServerSideURL()` (returns the absolute site URL).
   */
  getServerSideURL: () => string
  /**
   * Host's `generateMeta({ doc, url, type })` (returns Next.js
   * `Metadata`). The lib passes the canonical URL through so the
   * host can compose its title/description with the right base.
   */
  generateMeta: (args: { doc: Record<string, any>; url: string; type: 'website' | 'article' }) => Promise<Metadata>
  /**
   * When `true` (default), the route page renders a 404 for unknown
   * slugs. Set `false` to render an empty page.
   */
  notFoundOnMissing?: boolean
}

const HOME_SLUG = ''

/**
 * Build a Pages (or any collection) page route's exports:
 * `default` (the Page Server Component), `generateMetadata`,
 * `generateStaticParams`, and `generateSitemap`.
 *
 * The host imports this in `app/(frontend)/[slug]/page.tsx` and
 * destructures the result:
 *
 *   const { default: Page, generateMetadata, generateStaticParams } =
 *     createCollectionPageExports({ config: configPromise, importMap },
 *       { getServerSideURL, generateMeta: ... })
 *
 * Locales are read from the resolved config (`config.localization`).
 * First locale is the default. No next-intl glue required.
 */
export function createCollectionPageExports(
  { slug = 'pages', config: configPromise, importMap, renderPath }: CreateCollectionPageExportsArgs,
  deps: CreateCollectionPageExportsDeps,
  options: MetadataOptions = {}
) {
  const { jsonLd: jsonLdOption = true, changefreq = 'weekly', priority = 0.5, websiteName } = options
  const { getServerSideURL, generateMeta, notFoundOnMissing = true } = deps

  async function resolveLocales() {
    const cfg = await configPromise
    const loc = cfg.localization
    if (!loc) return { list: ['en'] as readonly string[], default: 'en' }
    const list = loc.localeCodes ?? (loc.locales as any[]).map((l: any) => l.code) ?? []
    const def = loc.defaultLocale ?? list[0] ?? 'en'
    return { list: list as readonly string[], default: def }
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

  const default_ = async (props: any): Promise<ReactElement> => {
    const { draftMode } = await import('next/headers')
    const { list: _locales, default: defaultLocale } = await resolveLocales()
    const { slug: rawSlug, locale: incomingLocale } = (await props.params) ?? {}
    const locale = typeof incomingLocale === 'string' ? incomingLocale : defaultLocale

    const storedSlug = segmentsToStoredSlug(rawSlug ?? '', false)
    const doc = await fetchDoc(locale, storedSlug)

    if (!doc && notFoundOnMissing) {
      const { notFound } = await import('next/navigation')
      notFound()
    }

    const { isEnabled: draft } = await draftMode()
    const cfg = await configPromise
    const collectionCustomPath = cfg.collections.find((c) => c.slug === slug)?.custom?.path
    const effectivePath = renderPath ?? collectionCustomPath ?? PAGES_RENDER_PATH

    const render =
      effectivePath === PAGES_RENDER_PATH
        ? doc
          ? <RenderBlocks
              blocks={(doc as any).blocks ?? []}
              importMap={importMap}
              config={cfg}
              locale={locale}
            />
          : null
        : renderCollectionModule(cfg.collections, slug, importMap, {
            ...props,
            config: cfg,
            locale,
            searchParams: props.searchParams,
            doc
          })

    const jsonLdNodes = doc ? await generateJsonLd(props, doc, locale) : []

    return (
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
                | React.ComponentType<any>
                | undefined
              if (!ResolvedListener) return null
              return (
                <Suspense fallback={null}>
                  <ResolvedListener />
                </Suspense>
              )
            })()
          : null}
      </>
    )
  }

  async function generateMetadata(props: any): Promise<Metadata> {
    const { list: locales, default: defaultLocale } = await resolveLocales()
    const cfg = await configPromise
    const { slug: rawSlug, locale: incomingLocale } = (await props.params) ?? {}
    const locale = typeof incomingLocale === 'string' ? incomingLocale : defaultLocale

    const storedSlug = segmentsToStoredSlug(rawSlug ?? '', false)
    const doc = await fetchDoc(locale, storedSlug)

    if (!doc) return { title: 'Not found', robots: { index: false, follow: false } }

    const collection = cfg.collections.find((c) => c.slug === slug)
    if (!collection) return {}

    const urlPath = getUrlPath(storedSlug, false, HOME_SLUG)
    const siteUrl = getServerSideURL()
    const canonical = `${siteUrl}/${locale}${urlPath}`
    const meta = await generateMeta({ doc, url: canonical, type: 'website' })

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

    meta.alternates = {
      canonical,
      languages: Object.keys(languages).length ? languages : undefined
    }

    return meta
  }

  async function generateJsonLd(_props: any, doc: any, locale: string): Promise<JsonLdOutput[]> {
    if (jsonLdOption === false || !doc) return []
    const siteUrl = getServerSideURL()
    const { slug: rawSlug } = (_props?.params ? await _props.params : { slug: '' }) as any
    const storedSlug = segmentsToStoredSlug(rawSlug ?? '', false)
    const urlPath = getUrlPath(storedSlug, false, HOME_SLUG)
    const canonical = `${siteUrl}/${locale}${urlPath}`

    const entries: JsonLdEntry[] = Array.isArray(jsonLdOption)
      ? jsonLdOption
      : [{ type: 'website' }]

    const outputs: JsonLdOutput[] = []
    for (const entry of entries) {
      const id = entry.id ?? `jsonld-${entry.type}-${outputs.length}`
      let schema: Record<string, unknown> | null = null

      switch (entry.type) {
        case 'article': {
          const articleOpts: ArticleLdOptions = {
            doc,
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
          if (!items.length && entry.buildItems) items = entry.buildItems(doc, canonical)
          if (items.length > 0) schema = buildBreadcrumbsLd({ items, currentUrl: canonical })
          break
        }
        case 'custom': {
          schema = entry.build({ doc, url: canonical, locale, siteUrl })
          break
        }
      }

      if (schema) outputs.push({ id, schema })
    }

    return outputs
  }

  async function generateStaticParams() {
    const { list: locales } = await resolveLocales()
    const params: Array<{ slug?: string; locale?: string }> = []
    for (const locale of locales) {
      const docs = await queryAllDocs({ collectionSlug: slug, slugField: 'slug', locale, config: configPromise })
      for (const doc of docs) {
        const slugVal = (doc as any).slug as string | undefined
        if (typeof slugVal !== 'string' || slugVal === '') continue
        params.push({ slug: slugVal, locale })
      }
    }
    return params
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const { list: locales, default: defaultLocale } = await resolveLocales()
    const docs = await queryAllDocs({ collectionSlug: slug, slugField: 'slug', locale: defaultLocale, config: configPromise })
    const siteUrl = getServerSideURL().replace(/\/$/, '')
    const urls: MetadataRoute.Sitemap = []
    for (const doc of docs) {
      const slugVal = (doc as any).slug as string | undefined
      if (typeof slugVal !== 'string' || slugVal === '') continue
      for (const locale of locales) {
        const urlPath = `/${slugVal}`
        const lastmod = doc.updatedAt ? new Date(doc.updatedAt as string).toISOString() : undefined
        urls.push({ url: `${siteUrl}/${locale}${urlPath}`, lastModified: lastmod, changeFrequency: changefreq, priority })
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
