import 'server-only'
import type { Metadata, MetadataRoute } from 'next'
import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactNode } from 'react'
import * as React from 'react'
import { paramsSlugToSlug, slugToParamsSlug } from '../metadata/slug'
import { queryAllLocaleSlugs, queryAllDocs, queryDoc } from '../metadata/query'
import { setRequestLocale } from "next-intl/server"
import { checkParams, NextPageProps } from "./utils/checkParams"
import { buildAlternates, RoutingConfig } from "./utils/buildLocalizedPath"
import { generateMeta } from "@justanarthur/payload-plugin-seo/next-metadata"
import { renderWWWDataModule } from "../renderWWWModule"

export type CreateCollectionPageExportsArgs<S extends string = 'pages'> = {
  slug?: S

  config: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig
}

export type CreateCollectionPageExportsDeps<S extends string> = {
  getServerSideURL: () => string
  pagePathPrefix?: string
}

export function createCollectionPageExports<S extends string = 'pages'>(
  {
    slug: collectionSlug = 'pages' as S,

    config: configPromise,
    importMap,

    routing
  }: CreateCollectionPageExportsArgs<S>,
  {
    getServerSideURL,
    pagePathPrefix
  }: CreateCollectionPageExportsDeps<S>
) {

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
    const params = checkParams(await props.params, ['slug', 'locale'])

    const locale = params.locale as string
    if (!routing.locales.includes(locale)) {
      const { notFound } = await import('next/navigation')
      return notFound()
    } else
      setRequestLocale(locale)

    const slug = paramsSlugToSlug(params.slug)

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
    const params = checkParams(await props.params, ['slug', 'locale'])
    const locale = params.locale as string,
      slug = paramsSlugToSlug(params.slug)

    const doc = await fetchDoc(locale, slug)

    if (!doc) return {}

    const localesSlug = (await queryAllLocaleSlugs({
      id: doc.id,
      collectionSlug,
      config: configPromise
    })) ?? {}

    const alternates = buildAlternates(locale, localesSlug, pagePathPrefix, { routing })

    const meta = await generateMeta({
      doc,
      url: alternates.canonical,
      type: 'website',
      locale
    })

    meta.alternates = alternates

    return meta
  }

  async function generateStaticParams(props: NextPageProps) {
    const locale = checkParams(await props.params, ['locale']).locale as string

    const docs = await queryAllDocs({ locale, collectionSlug, config: configPromise })

    return docs.map(doc => ({ slug: slugToParamsSlug(doc.slug) }))
  }

  async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = getServerSideURL(),
      locale = routing.defaultLocale

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

      const alternates = buildAlternates(locale, localesSlug, pagePathPrefix, { routing })

      return ({
        url: `${siteUrl}${alternates.canonical}`,
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

  const sitemaps = args.map(arg =>
    `${baseUrl}${arg.pagePathPrefix}/sitemap.xml`
  )
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((url) => `  <sitemap><loc>${url}</loc></sitemap>`).join('\n')}
</sitemapindex>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}
