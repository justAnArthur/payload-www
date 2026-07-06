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
