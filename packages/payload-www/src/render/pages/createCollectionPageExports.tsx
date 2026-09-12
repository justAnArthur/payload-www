import type { Metadata, MetadataRoute } from 'next'
import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactNode } from 'react'
import * as React from 'react'
import { paramsSlugToSlug, type SlugShape, slugToParamsSlug } from '../metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDoc, seedPayloadCache } from '../metadata/query'
import { setRequestLocale } from "next-intl/server"
import { NextPageProps } from "./utils/checkParams"
import { buildAlternates, RoutingConfig } from "./utils/buildLocalizedPath"
import { createSiteDefaults, generateMeta } from "@justanarthur/payload-plugin-seo/next-metadata"
import { renderWWWDataModule } from "../renderWWWModule"

export type CreateCollectionPageExportsArgs<S extends string = 'pages'> = {
  slug?: S

  _payloadConfig: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig

  slugShape?: SlugShape
}

export type CreateCollectionPageExportsDeps<S extends string> = {
  getServerSideURL: () => string
  pagePathPrefix?: string
}

export function createCollectionPageExports<S extends string = 'pages'>(
  {
    slug: collectionSlug = 'pages' as S,

    _payloadConfig,
    importMap,

    routing,
    slugShape = 'single'
  }: CreateCollectionPageExportsArgs<S>,
  {
    getServerSideURL,
    pagePathPrefix
  }: CreateCollectionPageExportsDeps<S>
) {
  seedPayloadCache({ config: _payloadConfig })

  const siteUrl = getServerSideURL()

  async function fetchDoc(locale: string, slug: string) {
    return queryDoc({
      slug,
      locale,

      collectionSlug
    })
  }

  const default_ = async (props: NextPageProps): Promise<ReactNode> => {
    const params = await props.params

    const locale = params.locale as string
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
      doc, { collectionSlug, config: _payloadConfig, importMap }, { ...props, locale }
    )

    return <>
      {rendered}
    </>
  }

  async function generateMetadata(props: NextPageProps): Promise<Metadata> {
    const params = await props.params

    const locale = params.locale as string,
      slug = paramsSlugToSlug(params.slug, slugShape)

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

  async function generateStaticParams(props: NextPageProps) {
    await props.params
    // Return every (locale, slug) pair across all declared locales. Next 16's
    // static shell pre-renders each pair; the layout's generateStaticParams
    // already supplies the per-locale fan-out, but listing the pairs here too
    // keeps the static shell self-describing if the layout ever drops the
    // locale fan-out.
    const perLocaleEntries = await Promise.all(
      routing.locales.map(async (locale) => {
        const docs = await queryAllDocs({ locale, collectionSlug })
        return docs
          .filter(doc => typeof doc.slug === 'string' && doc.slug.length > 0)
          .map(doc => ({ locale, slug: slugToParamsSlug(doc.slug, slugShape) }))
      })
    )
    return perLocaleEntries.flat()
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const locale = routing.defaultLocale

    const docs = await queryAllDocs({
      collectionSlug,
      locale: routing.defaultLocale
    })

    return await Promise.all(docs.map(async doc => {
      const localesSlug = (await queryAllLocaleSlugs({
        id: doc.id,
        collectionSlug
      })) ?? {}

      const alternates = buildAlternates(locale, localesSlug, pagePathPrefix, { routing, siteUrl })

      return ({
        url: alternates.canonical,
        alternates,
        lastModified: doc.updatedAt || new Date()
      })
    }))
  }

  generateSitemap.getServerSideURL = getServerSideURL
  generateSitemap.pagePathPrefix = pagePathPrefix

  return ({
    default: default_,
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
