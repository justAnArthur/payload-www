import type { Metadata, MetadataRoute } from 'next'
import { draftMode } from 'next/headers'
import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactElement } from 'react'

import { renderCollectionModule } from '../../core/utils/renderCollectionModule'
import { buildHreflangAlternates } from '../metadata/hreflang'
import {
  type ArticleLdOptions,
  type BreadcrumbItem,
  buildArticleLd,
  buildBreadcrumbsLd,
  buildOrganizationLd
} from '../metadata/jsonld'
import { getUrlPath, segmentsToStoredSlug, storedSlugToSegments } from '../metadata/slug'
import { getRenderModuleExports, queryAllDocs, queryAllLocaleSlugs, queryDocBySlug } from '../metadata/query'
import { LivePreviewListener } from '../components/index'
import { type CreateLayoutExportsOptions, handleLocale } from './createLayoutExports'
// PageProps type from Next — not re-exported as a runtime symbol so we
// use the structural form. Hosts can pass their own typed PageProps.
type PageProps<P = unknown> = {
  params: Promise<P>;
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

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
  nestedSlug?: boolean
  slugField?: string
  ogType?: 'website' | 'article'
  homeSlug?: string
  metaOverride?: (doc: Record<string, any>, meta: Metadata) => Metadata
  jsonLd?: boolean | JsonLdEntry[]
  changefreq?: MetadataRoute.Sitemap[number]['changeFrequency']
  priority?: number
}

export type CreateCollectionPageExportsArgs = {
  config: Promise<SanitizedConfig>
  slug?: string
  importMap: ImportMap
}

export type CreateCollectionPageExportsDeps = CreateLayoutExportsOptions & {
  defaultLocale: string
  locales: readonly string[]
  /** Host's `getServerSideURL()` (returns the absolute site URL). */
  getServerSideURL: () => string
  /**
   * Host's `generateMeta({ doc, url, type })` (returns Next.js
   * `Metadata`). The lib passes the canonical URL through so the
   * host can compose its title/description with the right base.
   */
  generateMeta: (args: { doc: Record<string, any>; url: string; type: 'website' | 'article' }) => Promise<Metadata>
}

export function createCollectionPageExports(
  { slug = 'pages', config: configPromise, importMap }: CreateCollectionPageExportsArgs,
  deps: CreateCollectionPageExportsDeps,
  options: MetadataOptions = {}
) {
  const {
    urlPrefix = '',
    nestedSlug = false,
    slugField = 'slug',
    ogType = 'website',
    homeSlug,
    metaOverride,
    jsonLd: jsonLdOption = true,
    changefreq = 'weekly',
    priority = 0.5
  } = options

  const siteUrl = deps.getServerSideURL()

  const default_ = async (props: PageProps<any>): Promise<ReactElement> => {
    const [config, { isEnabled: draft }, locale, jsonLdNodes] = await Promise.all([
      configPromise,
      draftMode(),
      handleLocale(props.params, deps),
      jsonLdOption !== undefined ? generateJsonLd(props) : Promise.resolve<JsonLdOutput[]>([])
    ])

    const render = renderCollectionModule(config.collections, slug, importMap, {
      ...props,
      config,
      locale,
      searchParams: props.searchParams
    })

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
        {draft && <LivePreviewListener/>}
      </>
    )
  }

  async function generateMetadata(props: PageProps<any>): Promise<Metadata> {
    const config = await configPromise
    const { slug: rawSlug, locale: incomingLocale } = await props.params

    if (!deps.hasLocale(deps.locales, incomingLocale)) {
      return { robots: { index: false, follow: false } }
    }

    const locale = incomingLocale
    const collection = config.collections.find((c) => c.slug === slug)
    if (!collection) return {}

    const customGenerateMetadata = getRenderModuleExports('generateMetadata', collection, importMap)
    if (customGenerateMetadata) {
      return customGenerateMetadata(props)
    }

    const storedSlug = segmentsToStoredSlug(rawSlug ?? [], nestedSlug as any)
    const urlPath = getUrlPath(rawSlug ?? [], nestedSlug, homeSlug ?? '')

    const doc = await queryDocBySlug({
      collectionSlug: slug,
      slug: storedSlug,
      slugField,
      locale,
      draft: true,
      config: configPromise
    })

    if (!doc) return { title: 'Not found', robots: { index: false, follow: false } }

    const canonical = `${siteUrl}/${locale}${urlPrefix}${urlPath}`
    const meta = await deps.generateMeta({ doc, url: canonical, type: ogType })

    const languages = await buildHreflangAlternates({
      siteUrl,
      locale,
      urlPrefix,
      storedSlug,
      nested: nestedSlug,
      homeSlug: homeSlug ?? '',
      defaultLocale: deps.defaultLocale,
      locales: deps.locales,
      queryAllLocaleSlugs: (s, l) =>
        queryAllLocaleSlugs({ collectionSlug: slug, slug: s, slugField, locale: l, config: configPromise })
    })

    meta.alternates = {
      canonical,
      languages: Object.keys(languages).length ? languages : undefined
    }

    return metaOverride ? metaOverride(doc, meta) : meta
  }

  async function generateJsonLd(props: PageProps<any>): Promise<JsonLdOutput[]> {
    if (jsonLdOption === undefined) return []

    const entries: JsonLdEntry[] = Array.isArray(jsonLdOption)
      ? jsonLdOption
      : [{ type: 'website' }]

    const { slug: rawSlug, locale: incomingLocale } = await props.params
    if (!deps.hasLocale(deps.locales, incomingLocale)) return []

    const locale = incomingLocale
    const storedSlug = segmentsToStoredSlug(rawSlug ?? [], nestedSlug as any)
    const urlPath = getUrlPath(rawSlug ?? [], nestedSlug, homeSlug ?? '')

    const doc = await queryDocBySlug({
      collectionSlug: slug,
      slug: storedSlug,
      slugField,
      locale,
      draft: true,
      config: configPromise
    })

    if (!doc) return []

    const canonical = `${siteUrl}/${locale}${urlPrefix}${urlPath}`

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
            name: entry.name ?? new URL(siteUrl).hostname,
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

  async function generateStaticParams(props: { params: { locale: string } }) {
    const locale = deps.hasLocale(deps.locales, props.params.locale)
      ? props.params.locale
      : deps.defaultLocale

    const docs = await queryAllDocs({
      collectionSlug: slug,
      slugField,
      locale,
      config: configPromise
    })

    return docs
      .map((doc) => {
        const slugVal = doc[slugField] as string | undefined
        if (!slugVal) return null
        if (homeSlug && slugVal === homeSlug) return null
        return { slug: storedSlugToSegments(slugVal, nestedSlug as any), locale }
      })
      .filter(Boolean) as { slug: string[]; locale: string }[]
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const docs = await queryAllDocs({
      collectionSlug: slug,
      slugField,
      locale: deps.defaultLocale,
      config: configPromise
    })

    const urls: MetadataRoute.Sitemap = []
    for (const doc of docs) {
      const slugVal = doc[slugField] as string | undefined
      if (!slugVal) continue
      if (homeSlug && slugVal === homeSlug) continue

      for (const locale of deps.locales) {
        const lastmod = doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined
        const urlPath = nestedSlug ? '/' + slugVal.replaceAll('_', '/') : '/' + slugVal
        const prefix = urlPrefix.replace(/\/$/, '')
        const url = `${siteUrl}/${locale}${prefix}${urlPath}`
        urls.push({ url, lastModified: lastmod, changeFrequency: changefreq, priority })
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
