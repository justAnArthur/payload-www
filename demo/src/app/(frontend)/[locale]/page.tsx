import { notFound } from 'next/navigation'
import * as React from 'react'
import { cache } from 'react'

import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'

import { getServerSideURL } from '@/utilities/getURL'
import { routing } from '@/i18n/routing'

import type { Page, Post } from '@/payload-types'

/**
 * Home page rendered by the lib. `slug: ''` makes the lib's page
 * factory resolve the Pages doc with empty slug (the home) and
 * render it inside the lib's `<PageShowcase>` sidebar — so visitors
 * see the page's metadata, the JSON-LD payload, and a language
 * switcher alongside the body. The `homeExtras` callback queries
 * recent Pages + Posts and renders them as a navigation list under
 * the home body.
 *
 * The home lives at `app/(frontend)/[locale]/page.tsx`. Catch-all
 * docs are at `app/(frontend)/[locale]/[...slug]/page.tsx`.
 *
 * The `doc` argument to `generateMeta` and `homeExtras` is the
 * host's generated `Page` type — localized fields are already
 * resolved for the active locale, so we read `doc.title` directly
 * as a string (no `as any`, no `readLocalizedText`).
 */
const generateMeta = async ({ doc }: { doc: Page | null }): Promise<{ title: string; description: string }> => {
  const fallback = 'payload-www demo'
  const fallbackDescription =
    'A minimal showcase for the @justanarthur/payload-www lib — Pages, Posts, Header, Footer, SEO, image hash, translator, live preview, and a Pages-collection page exporter that wraps everything in a sidebar with metadata + JSON-LD + language switcher.'
  if (!doc) return { title: fallback, description: fallbackDescription }
  return { title: doc.title, description: fallbackDescription }
}

// Cached list of recent pages + posts for the home extras. The
// cache key includes the locale so SSR and the static export share
// the same fetch.
const fetchRecent = cache(async (locale: string) => {
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config: configPromise })
  const typedLocale = locale as (typeof routing.locales)[number]
  const [pagesRes, postsRes] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { slug: { not_equals: '' } },
      sort: '-updatedAt',
      limit: 8,
      depth: 0,
      draft: false,
      locale: typedLocale,
      overrideAccess: true
    }),
    payload.find({
      collection: 'posts',
      sort: '-updatedAt',
      limit: 8,
      depth: 0,
      draft: false,
      locale: typedLocale,
      overrideAccess: true
    })
  ])
  const mapDoc = (p: { id: number | string; slug: string; title?: string | null }) => ({
    id: p.id,
    slug: p.slug,
    title: p.title ?? p.slug
  })
  return {
    pages: (pagesRes.docs as Page[]).map(mapDoc),
    posts: (postsRes.docs as Post[]).map(mapDoc)
  }
})

const { default: Page, generateMetadata, generateStaticParams } = createCollectionPageExports(
  { config: configPromise, routing /* slug defaults to 'pages' */ },
  {
    getServerSideURL,
    generateMeta,
    showcase: { enabled: true },
    homeExtras: async ({ locale }) => {
      const { pages, posts } = await fetchRecent(locale)
      if (pages.length === 0 && posts.length === 0) return null
      return (
        <section className="home-extras container mt-16 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Pages on this site</h2>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm">
            {pages.map((p) => (
              <li key={p.id}>
                <a className="underline" href={`/${locale}/${p.slug}`}>
                  /{locale}/{p.slug}
                </a>
                {' — '}
                {p.title}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-2xl font-semibold tracking-tight">Posts on this site</h2>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm">
            {posts.map((p) => (
              <li key={p.id}>
                <a className="underline" href={`/${locale}/posts/${p.slug}`}>
                  /{locale}/posts/{p.slug}
                </a>
                {' — '}
                {p.title}
              </li>
            ))}
          </ul>
        </section>
      )
    }
  }
)

export { generateMetadata, generateStaticParams }
export default Page
