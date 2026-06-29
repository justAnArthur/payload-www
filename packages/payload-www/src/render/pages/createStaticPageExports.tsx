import 'server-only'

import type { ImportMap, SanitizedConfig } from 'payload'
import type { ReactElement } from 'react'

import { PagesPage } from './PagesPage'
import { STATIC_PAGES_SLUG } from '../../data/collections/StaticPages'
import { queryDocBySlug } from "../metadata/query"

export type CreateStaticPageExportsArgs = {
  /**
   * The `kind` discriminator to fetch from the `staticPages`
   * collection. Default: `'not-found'`. The factory fetches the
   * row where `kind === {kind}` and renders its `blocks` via
   * `PagesPage` (the same component the catch-all dynamic route
   * uses).
   */
  kind?: string
  /**
   * Payload config promise (same shape as `createCollectionPageExports`).
   */
  config: Promise<SanitizedConfig>
  /**
   * Host's Payload importMap. Same purpose as the Pages factory.
   * Default: `{}`.
   */
  importMap?: ImportMap
}

/**
 * Build a static page's default export — designed for Next.js
 * `not-found.tsx` / `error.tsx` (and similar) route files. Static
 * pages are addressed by a `kind` discriminator, not a slug, so
 * they don't need metadata, sitemap, or static-params plumbing.
 *
 * Per Next.js docs, not-found/error components receive **no
 * props**. The active locale is read via `getLocale()` from
 * `next-intl/server`, which reads from the request config
 * populated by middleware from the `[locale]` URL segment (the
 * host's `i18n/request.ts` handles invalid-locale fallback
 * before this returns).
 *
 *   // app/(frontend)/[locale]/not-found.tsx
 *   import configPromise from '@payload-config'
 *   import { createStaticPageExports } from '@justanarthur/payload-www/render-pages'
 *   import { importMap } from '@/app/(payload)/admin/importMap.js'
 *
 *   const { default: NotFound } = createStaticPageExports({
 *     config: configPromise,
 *     importMap,
 *   })
 *   export default NotFound
 *
 *   // app/(frontend)/[locale]/server-error.tsx
 *   const { default: ServerError } = createStaticPageExports({
 *     kind: 'server-error',
 *     config: configPromise,
 *     importMap,
 *   })
 *   export default ServerError
 */
export function createStaticPageExports({
                                          kind = 'not-found',
                                          config: configPromise,
                                          importMap: importMapArg
                                        }: CreateStaticPageExportsArgs): {
  default: () => Promise<ReactElement>
} {
  const importMap: ImportMap = importMapArg ?? {}

  const default_ = async (): Promise<ReactElement> => {
    const { getLocale } = await import('next-intl/server')
    const locale = await getLocale()

    const doc = await queryDocBySlug({
      collectionSlug: STATIC_PAGES_SLUG,
      slug: kind,
      slugField: 'kind',
      locale,
      config: configPromise
    })

    if (!doc) {
      console.warn('[createStaticPageExports] !doc: ' + 'STATIC_PAGES_SLUG=', STATIC_PAGES_SLUG, 'slug:' + kind)
      return (
        <section>
          <h1>
            404
          </h1>
        </section>
      )
    }

    const cfg = await configPromise

    return <PagesPage doc={doc} locale={locale} importMap={importMap} config={cfg}/>
  }

  return { default: default_ }
}
