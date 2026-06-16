// Render-path constants — the keys Payload's importMap uses to resolve
// the lib's default Server Components. Hosts that want to override the
// default visual pass a different `custom.path` on the collection /
// global they re-define via `createPagesCollection` /
// `createHeaderGlobal` / `createFooterGlobal`.
export const PAGES_RENDER_PATH = '@justanarthur/payload-www/render-pages#PagesPage'
export const HEADER_RENDER_PATH = '@justanarthur/payload-www/render-pages#HeaderPage'
export const FOOTER_RENDER_PATH = '@justanarthur/payload-www/render-pages#FooterPage'

// The live-preview listener path. Resolved through the importMap at
// render time (not via a static `import`) so the lib's server
// `render-pages` dist stays free of `'use client'` imports. Hosts
// that want a different listener can register a component under this
// key in their own importMap.
export const LIVE_PREVIEW_LISTENER_PATH = '@justanarthur/payload-www/render-components#LivePreviewListener'

// The Pages collection slug. Used as the default `linkRelationTo` for
// the lib's Header / Footer nav `link` fields and for the `link()`
// factory's default `relationTo`. Hosts that don't have a `pages`
// collection can pass an explicit `linkRelationTo` to the lib.
export const PAGES_SLUG = 'pages'

// Sitemap tag the Pages collection's revalidation hook invalidates
// whenever a page is saved. The `createSitemapHandler` route handler
// reads from this tag so the generated sitemap refreshes after
// edits.
export const PAGES_SITEMAP_TAG = 'pages-sitemap'
