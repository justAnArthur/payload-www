import 'server-only'
import type { Metadata, MetadataRoute } from 'next'
import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactNode } from 'react'
import * as React from 'react'
import { paramsSlugToSlug, type SlugShape, slugToParamsSlug } from '../metadata/slug'
import { queryAllDocs, queryAllLocaleSlugs, queryDoc } from '../metadata/query'
import { setRequestLocale } from "next-intl/server"
import { NextPageProps } from "./utils/checkParams"
import { buildAlternates, RoutingConfig } from "./utils/buildLocalizedPath"
import { createSiteDefaults, generateMeta } from "@justanarthur/payload-plugin-seo/next-metadata"
import { renderWWWDataModule } from "../renderWWWModule"

export type CreateCollectionPageExportsArgs<S extends string = 'pages'> = {
  slug?: S

  config: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig

  slugShape?: SlugShape
}

export type CreateCollectionPageExportsDeps<S extends string> = {
  getServerSideURL: () => string
  pagePathPrefix?: string
  // ponytail: hosts (acadsys-www) pass a custom `generateMeta` to override
  // the lib's default from @justanarthur/payload-plugin-seo. Keep it loose
  // so adding new optional fields doesn't break existing host code.
  generateMeta?: (...args: any[]) => any
  metadataType?: 'website' | 'article'
}

export function createCollectionPageExports<S extends string = 'pages'>(
  {
    slug: collectionSlug = 'pages' as S,

    config: configPromise,
    importMap,

    routing,
    slugShape = 'single'
  }: CreateCollectionPageExportsArgs<S>,
  {
    getServerSideURL,
    pagePathPrefix
  }: CreateCollectionPageExportsDeps<S>
) {
  const siteUrl = getServerSideURL()

  async function fetchDoc(locale: string, slug: string) {
    return queryDoc({
      slug,
      locale,

      collectionSlug
    }, {
      config: configPromise
    })
  }

  const default_ = async (props: NextPageProps): Promise<ReactNode> => {
    // ponytail: defensive guard — Next.js can call the page default with no
    // props during route enumeration (e.g. when a more specific sibling route
    // is being resolved). Without this guard we crash on `h.locale` because
    // `g.params` is undefined. Real renders always have `{params, searchParams}`.
    if (!props || !props.params) {
      const { notFound } = await import('next/navigation')
      notFound()
    }
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
      doc, { collectionSlug, config: configPromise, importMap }, { ...props, locale }
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
          collectionSlug,
          config: configPromise
        })
        : Promise.resolve({} as Record<string, string> | null),
      createSiteDefaults({ config: configPromise, locale })
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
    const locale = (await props.params).locale as string

    const docs = await queryAllDocs({ locale, collectionSlug, config: configPromise })

    return docs
      .filter(doc => typeof doc.slug === 'string' && doc.slug.length > 0)
      .map(doc => ({ slug: slugToParamsSlug(doc.slug, slugShape) }))
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const locale = routing.defaultLocale

    const docs = await queryAllDocs({
      collectionSlug,
      locale,
      config: configPromise
    })

    return await Promise.all(docs.map(async doc => {
      const localesSlug = (await queryAllLocaleSlugs({
        id: doc.id,
        collectionSlug,
        config: configPromise
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
