
import type { ImportMap, SanitizedConfig } from 'payload'
import { Activity, type HTMLAttributes, type ReactNode } from 'react'
import { queryDoc, RENDER_DEPTH, seedPayloadCache } from '../metadata/query'
import { NextLayoutProps } from "./utils/checkParams"
import { setRequestLocale } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { RoutingConfig } from "./utils/buildLocalizedPath"
import { renderWWWDataModule } from "../renderWWWModule"
import { RootJsonLd } from "@justanarthur/payload-plugin-seo/root-jsonld"
import * as rootParams from 'next/root-params'

/**
 * `next/root-params` exposes one getter per dynamic segment above the root
 * layout. The getters are generated in the consuming app, so resolve ours
 * defensively — a consumer whose locale segment is not a root param still
 * falls back to `props.params` below.
 */
const readLocaleRootParam = (rootParams as Record<string, unknown>).locale as
  | (() => Promise<string | undefined>)
  | undefined

/**
 * Awaiting a *root param* is prerender-safe: its values come from
 * `generateStaticParams`, so Next can still build the static shell. Awaiting
 * `props.params` is not — under `cacheComponents` it counts as runtime data and
 * fails instant-navigation validation for every route under this layout:
 *
 *   Route "/[locale]/[[...slug]]": Next.js encountered runtime data during
 *   prerendering ... at RootLayout [Prerender]
 */
async function resolveLocale(props: NextLayoutProps): Promise<string> {
  if (readLocaleRootParam) {
    const locale = await readLocaleRootParam()
    if (locale) return locale
  }

  return (await props.params).locale as string
}

export type CreateRootLayoutExportsArgs = {
  _payloadConfig: Promise<SanitizedConfig>
  importMap: ImportMap

  routing: RoutingConfig

  /**
   * How many relationship / upload hops to populate on the header and footer globals.
   * Defaults to `2` — Payload's own default. `0` hands every logo and nav reference to
   * the render component as a bare id.
   */
  depth?: number
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
    _payloadConfig,
    importMap,

    routing,
    depth = RENDER_DEPTH
  }: CreateRootLayoutExportsArgs,
  {
    providers,
    htmlAttrs,
    getServerSideURL
  }: CreateRootLayoutExportsDeps = {}
) {

  seedPayloadCache({ config: _payloadConfig })

  async function RootLayout(props: NextLayoutProps) {
    const locale = await resolveLocale(props)
    if (!routing.locales.includes(locale)) {
      const { notFound } = await import('next/navigation')
      return notFound()
    } else
      setRequestLocale(locale)

    const [
      header,
      footer
    ] = await Promise.all([
      queryDoc({ globalSlug: 'header', locale, depth }),
      queryDoc({ globalSlug: 'footer', locale, depth })
    ])

    const
      renderedHeader = renderWWWDataModule(
        header, { collectionSlug: 'header', configPath: 'globals', config: _payloadConfig, importMap },
        { ...props, locale }
      ),
      renderedFooter = renderWWWDataModule(
        footer, { collectionSlug: 'footer', configPath: 'globals', config: _payloadConfig, importMap },
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
        config={_payloadConfig}
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
        <Activity>{renderedHeader}</Activity>
        {providers ? providers({ children: props.children, locale }) : props.children}
        <Activity>{renderedFooter}</Activity>
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
