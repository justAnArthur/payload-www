import type { FC, ReactNode } from 'react'
import type { ImportMap, SanitizedConfig } from 'payload'
import { notFound } from 'next/navigation'

import { renderCollectionModule } from '../../core/utils/renderCollectionModule'

/**
 * Build a Next.js layout component for the host's Payload site.
 *
 * Mirrors the camasys `payload-www/pages/createLayoutExports.tsx`
 * shape. The host supplies the Next.js `i18n` integration
 * (next-intl's `hasLocale`, `routing`, `setRequestLocale`) and
 * the `<html>`/`<body>` rendering — the lib just wires the
 * Header/Footer globals through the importMap.
 */
export type CreateLayoutExportsOptions = {
  /** next-intl's hasLocale function. */
  hasLocale: <L extends string>(locales: readonly L[], candidate: string) => candidate is L
  /** next-intl's setRequestLocale function. */
  setRequestLocale: (locale: string) => void
  /** next-intl's routing (for the locale list passed to hasLocale). */
  routing: { locales: readonly string[] }
  /** Optional html/body className merge. */
  htmlAttrs?: Record<string, unknown>
}

export function createLayoutExports(
  { config: configPromise, importMap }: { config: Promise<SanitizedConfig>; importMap: ImportMap },
  options: CreateLayoutExportsOptions
) {
  return {
    default: (() => {
      const Header: FC<{ locale?: string }> = async (props) => {
        const config = await configPromise
        return renderCollectionModule(config.globals, 'header', importMap, props as Record<string, unknown>)
      }

      const Footer: FC<{ locale?: string }> = async (props) => {
        const config = await configPromise
        return renderCollectionModule(config.globals, 'footer', importMap, props as Record<string, unknown>)
      }

      const Html: FC<{ children?: ReactNode; lang?: string }> = (props) => {
        return <html {...(options.htmlAttrs ?? {})} {...props} />
      }

      const Layout: FC<{ children: ReactNode; params: any }> & {
        HTML: typeof Html
        Header: typeof Header
        Footer: typeof Footer
      } = async ({ params: paramsPromise, children }) => {
        const locale = await handleLocale(paramsPromise, options)
        return (
          <Html lang={locale}>
            <body>
            <Header locale={locale}/>
            {children}
            <Footer locale={locale}/>
            </body>
          </Html>
        )
      }

      Layout.HTML = Html
      Layout.Header = Header
      Layout.Footer = Footer
      return Layout
    })()
  }
}

export async function handleLocale(
  paramsPromise: Promise<{ locale: string }>,
  options: Pick<CreateLayoutExportsOptions, 'hasLocale' | 'routing' | 'setRequestLocale'>
): Promise<string> {
  const { locale } = await paramsPromise
  if (!options.hasLocale(options.routing.locales, locale)) {
    return notFound()
  }
  options.setRequestLocale(locale)
  return locale
}
