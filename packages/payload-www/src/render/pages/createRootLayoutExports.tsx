import 'server-only'
// next-intl (`getMessages`, `setRequestLocale`) and `next/headers`
// (`draftMode`) are App-Router-only. Imported lazily inside the
// function body so a Node entrypoint (e.g. `payload.config.ts`)
// doesn't pull this module into its static graph at module-init
// time. Same pattern `createCollectionPageExports` uses.

import type { ImportMap, SanitizedConfig } from 'payload'
import type { HTMLAttributes, ReactElement, ReactNode } from 'react'

import { queryGlobal } from '../metadata/query'
import { renderGlobalModule } from '../utils/renderGlobalModule'
import type { PageRouting } from './createCollectionPageExports'

export type CreateRootLayoutProvidersArgs = {
  children: ReactNode
  locale: string
  /** Messages for the active locale — hosts pass these into
   * `NextIntlClientProvider`. The lib fetches them once per request
   * and exposes them here so the host doesn't have to. */
  messages: Record<string, any>
  /** Whether Next.js draft mode is currently active. Hosts typically
   * pass this to `<AdminBar preview={draftMode} />`. */
  draftMode: boolean
}

export type CreateRootLayoutExportsArgs = {
  /** Payload config promise — same shape `createCollectionPageExports` uses. */
  config: Promise<SanitizedConfig>
  /** next-intl routing config (locales + defaultLocale + localePrefix).
   * Same `PageRouting` shape the rest of the lib uses. */
  routing: PageRouting
  /**
   * The host's Payload importMap. The lib uses this to resolve
   * header / footer globals' `custom.path` entries through
   * `renderGlobalModule`. Pass `import { importMap } from
   * '@/app/(payload)/admin/importMap.js'` (or equivalent path) from
   * the host's layout file. Default: `{}` — header/footer globals
   * with `custom.path` set won't render unless the matching entry
   * is in the supplied importMap.
   */
  importMap?: ImportMap
  /**
   * Single composition point for the entire provider tree —
   * AdminBar, NextIntlClientProvider, theme, analytics, etc.
   * Receives `draftMode` so the host can render `<AdminBar>` here
   * without re-reading from `next/headers` themselves.
   *
   * Default: identity (`({ children }) => children`) — wraps nothing.
   */
  providers?: (args: CreateRootLayoutProvidersArgs) => ReactNode
  /**
   * Optional content rendered inside `<head>`. Hosts drop favicons,
   * `<link rel>` tags, theme initialization, etc.
   *
   * Default: no extra head content (lib doesn't ship favicons —
   * that's host content).
   */
  head?: () => ReactNode
  /**
   * Optional `<html>` attribute overrides. The lib already applies
   * `lang={locale}` and `suppressHydrationWarning` — host additions
   * are merged on top.
   */
  htmlAttrs?: (locale: string) => HTMLAttributes<HTMLHtmlElement>
}

export type CreateRootLayoutExportsReturn = {
  /** Default export for `app/(frontend)/[locale]/layout.tsx`. */
  default: (props: { children: ReactNode; params: Promise<{ locale: string }> }) => Promise<ReactElement>
  /** Pre-render every locale at build time. */
  generateStaticParams: () => Array<{ locale: string }>
}

/**
 * Build the lib's root layout exports. Renders:
 *
 *   <html {htmlAttrs}>
 *     <head>
 *       {head?.()}
 *     </head>
 *     <body>
 *       {providers({ children: (
 *         <Header data={...} locale={...} />
 *         {children}
 *         <Footer data={...} locale={...} />
 *       ), locale, messages, draftMode })}
 *     </body>
 *   </html>
 *
 * Header and Footer are fetched per-locale via the lib's
 * `queryGlobal` and rendered through their globals' `custom.path`
 * — the same mechanism pages/posts use. Hosts override visuals by
 * setting a different `renderPath` on the global via
 * `createHeaderGlobal({ renderPath })` / `createFooterGlobal({ ... })`.
 *
 * Usage — minimal:
 *
 *   // app/(frontend)/[locale]/layout.tsx
 *   import { createRootLayoutExports } from '@justanarthur/payload-www/render-pages'
 *   import { NextIntlClientProvider } from 'next-intl'
 *   import { AdminBar } from '@justanarthur/payload-www/render-components'
 *   import { routing } from '@/i18n/routing'
 *   import configPromise from '@payload-config'
 *
 *   const { default: RootLayout, generateStaticParams } = createRootLayoutExports({
 *     config: configPromise,
 *     routing,
 *     providers: ({ children, locale, messages, draftMode }) => (
 *       <>
 *         <AdminBar preview={draftMode} />
 *         <NextIntlClientProvider locale={locale} messages={messages}>
 *           {children}
 *         </NextIntlClientProvider>
 *       </>
 *     ),
 *     head: () => <link href="/favicon.ico" rel="icon" sizes="32x32" />
 *   })
 *
 *   export { generateStaticParams }
 *   export default RootLayout
 */
export function createRootLayoutExports(args: CreateRootLayoutExportsArgs): CreateRootLayoutExportsReturn {
  const { config: configPromise, routing, importMap = {}, providers, head, htmlAttrs } = args

  async function RootLayout({
    children,
    params
  }: {
    children: ReactNode
    params: Promise<{ locale: string }>
  }): Promise<ReactElement> {
    const { locale } = await params
    console.log('[WWW] render/pages:createRootLayoutExports:RootLayout locale=', locale)
    if (!routing.locales.includes(locale as any)) {
      console.error('[WWW] render/pages:createRootLayoutExports:RootLayout invalid locale=', locale)
      const { notFound } = await import('next/navigation')
      notFound()
    }

    // next-intl's setRequestLocale is required for async server
    // components when next-intl server APIs (translations,
    // date-fns locale, etc.) are used downstream.
    const { setRequestLocale, getMessages } = await import('next-intl/server')
    setRequestLocale(locale)
    const messages = await getMessages()

    // draftMode() lives behind a request-time boundary; read once
    // and pass through to the host's providers slot.
    const { draftMode: nextDraftMode } = await import('next/headers')
    const { isEnabled: draftMode } = await nextDraftMode()
    console.log('[WWW] render/pages:createRootLayoutExports:RootLayout draftMode=', draftMode)

    const cfg = await configPromise

    // Fetch + render header and footer in parallel — each global
    // gets its own `custom.path` resolved via the host-supplied
    // importMap.
    const [headerData, footerData] = await Promise.all([
      queryGlobal({ globalSlug: 'header', locale, depth: 0, config: configPromise }),
      queryGlobal({ globalSlug: 'footer', locale, depth: 0, config: configPromise })
    ])
    console.log('[WWW] render/pages:createRootLayoutExports:RootLayout header?', Boolean(headerData), 'footer?', Boolean(footerData))

    const headerEl = renderGlobalModule(cfg.globals, 'header', importMap, {
      data: headerData,
      locale
    })
    const footerEl = renderGlobalModule(cfg.globals, 'footer', importMap, {
      data: footerData,
      locale
    })

    const htmlAttributeOverrides = htmlAttrs?.(locale) ?? {}
    const mergedHtmlAttrs: HTMLAttributes<HTMLHtmlElement> = {
      lang: locale,
      suppressHydrationWarning: true,
      ...htmlAttributeOverrides
    }

    const providersArgs: CreateRootLayoutProvidersArgs = {
      children: (
        <>
          {headerEl}
          {children}
          {footerEl}
        </>
      ),
      locale,
      messages,
      draftMode
    }

    return (
      <html {...mergedHtmlAttrs}>
        <head>
          {head?.()}
        </head>
        <body>
          {providers ? providers(providersArgs) : children}
        </body>
      </html>
    )
  }

  return {
    default: RootLayout,
    generateStaticParams: () => routing.locales.map((locale) => ({ locale }))
  }
}
