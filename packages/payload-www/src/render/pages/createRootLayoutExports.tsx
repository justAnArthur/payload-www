import 'server-only'


import type { ImportMap, SanitizedConfig } from 'payload'
import type { HTMLAttributes, ReactNode } from 'react'
import { queryDoc } from '../metadata/query'
import { checkParams, NextLayoutProps } from "./utils/checkParams"
import { setRequestLocale } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { RoutingConfig } from "./utils/buildLocalizedPath"
import { renderWWWDataModule } from "../renderWWWModule"

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
}

export function createRootLayoutExports(
  {
    config: configPromise,
    importMap,

    routing
  }: CreateRootLayoutExportsArgs,
  {
    providers,
    htmlAttrs
  }: CreateRootLayoutExportsDeps = {}
) {

  async function RootLayout(props: NextLayoutProps) {
    const params = checkParams(await props.params, ['locale'])

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

    return (
      <html {...mergedHtmlAttrs}>
      <body>
      <NextIntlClientProvider>
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
