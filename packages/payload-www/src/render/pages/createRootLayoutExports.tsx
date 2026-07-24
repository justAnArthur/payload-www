import 'server-only'


import type { ImportMap, SanitizedConfig } from 'payload'
import type { HTMLAttributes, ReactNode } from 'react'
import { queryDoc } from '../metadata/query'
import { NextLayoutProps } from "./utils/checkParams"
import { setRequestLocale } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { RoutingConfig } from "./utils/buildLocalizedPath"
import { renderWWWDataModule } from "../renderWWWModule"
import { RootJsonLd } from "@justanarthur/payload-plugin-seo/root-jsonld"

export type CreateRootLayoutExportsArgs = {
  config: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig
}

export type CreateRootLayoutProvidersArgs = {
  children: ReactNode
  locale: string
}

export type CreateRootLayoutExportsDeps = {
  providers?: (args: CreateRootLayoutProvidersArgs) => ReactNode
  htmlAttrs?: (locale: string) => HTMLAttributes<HTMLHtmlElement>

  // Pass to auto-inject the site-wide Organization / WebSite / Product JSON-LD
  // `<script>` tag into the root layout. Omit (or pass `undefined`) to skip JSON-LD.
  getServerSideURL?: () => string
}

export function createRootLayoutExports(
  {
    config: configPromise,
    importMap,

    routing
  }: CreateRootLayoutExportsArgs,
  {
    providers,
    htmlAttrs,
    getServerSideURL
  }: CreateRootLayoutExportsDeps = {}
) {

  async function RootLayout(props: NextLayoutProps) {
    // ponytail: `params` is a PROMISE in Next.js 15 AND 16 — layouts are not
    // exempt. A previous change dropped this await on the belief that Next 16
    // passes a sync object; it does not. Reading `.locale` off the un-awaited
    // promise yielded `undefined`, so the locale check below failed and this
    // layout called notFound() for EVERY request — every page 404'd while the
    // page components underneath resolved their documents perfectly. Note the
    // page factory (createCollectionPageExports) awaits it correctly; this was
    // the odd one out.
    const params = await props.params

    const locale = params.locale as string
    if (!routing.locales.includes(locale)) {
      const { notFound } = await import('next/navigation')
      return notFound()
    } else
      setRequestLocale(locale)

    const [
      header,
      footer
    ] = await Promise.all([
      queryDoc({ globalSlug: 'header', locale }, { config: configPromise }),
      queryDoc({ globalSlug: 'footer', locale }, { config: configPromise })
    ])

    const
      renderedHeader = renderWWWDataModule(
        header, { collectionSlug: 'header', configPath: 'globals', config: configPromise, importMap },
        { ...props, locale }
      ),
      renderedFooter = renderWWWDataModule(
        footer, { collectionSlug: 'footer', configPath: 'globals', config: configPromise, importMap },
        { ...props, locale }
      )

    const mergedHtmlAttrs: HTMLAttributes<HTMLHtmlElement> = ({
      lang: locale,
      suppressHydrationWarning: true,
      ...(htmlAttrs?.(locale) ?? {})
    })

    // Auto-inject the seo plugin's RootJsonLd when getServerSideURL is provided.
    // Lives as the first child so it ships in the initial HTML (SEO crawlers
    // don't execute JS to read it).
    const rootJsonLd = getServerSideURL ? (
      <RootJsonLd
        config={configPromise}
        locale={locale as never}
        getServerSideURL={getServerSideURL}
        locales={routing.locales}
      />
    ) : null

    return (
      <html {...mergedHtmlAttrs}>
      <body>
      <NextIntlClientProvider>
        {rootJsonLd}
        {renderedHeader}
        {providers ? providers({ children: props.children, locale }) : props.children}
        {renderedFooter}
      </NextIntlClientProvider>
      </body>
      </html>
    )
  }

  return {
    default: RootLayout,
    generateStaticParams: () => routing.locales.map((locale) => ({ locale }))
  }
}
