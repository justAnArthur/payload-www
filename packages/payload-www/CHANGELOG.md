# Changelog

All notable changes to `@justanarthur/payload-www` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Breaking changes

- **Pages / Posts `slug` is now localized by default.** The lib's
  collections are multilingual, so the slug field is `localized: true`
  (one slug per locale — `/about` in `en`, `/o-nas` in `sk`), stored in
  the collection's `_locales` table. This powers per-locale URLs and
  hreflang alternates. Hosts on a single shared slug must pass
  `localized: false` to the extracted `slugField()` (or override the
  field), and existing non-localized data needs a DB migration to move
  `slug` into `<collection>_locales`.
- **Revalidation tag rename — Posts.** The Posts collection's
  revalidation hook used to fire per-locale tags of the form
  `global_posts_<locale>`. It now fires `collection_posts_<id>`
  (matching the new universal `collection_<slug>_<id>` shape) and
  invalidates `<slug>-sitemap` alongside paths. Hosts that cached by
  the old per-locale tag must update their cache keys. No compat
  shim — the old tag is gone.
- **`createRevalidatePageHooks()` is now a deprecated alias.** The
  canonical factory is `createRevalidateCollectionHook({ collectionSlug,
  urlPathPrefix, sitemapTag?, localePrefix?, defaultLocale? })`.
  `createRevalidatePageHooks()` still works but is preserved only for
  backward compat with hosts that imported this name directly — it
  emits a one-time deprecation warning and forwards to the canonical
  factory with `collectionSlug: 'pages'`, `urlPathPrefix: ''`.
- **Unified `sitemap.xml` (Next.js file convention).** The lib used
  to ship a `createSitemapHandler` route handler invoked from
  `app/(frontend)/pages-sitemap.xml/route.ts`. It now ships
  `createSitemapFile` — a `MetadataRoute.Sitemap` factory invoked
  from `app/(frontend)/sitemap.ts` (Next.js's file-convention default
  export, served at `/sitemap.xml`). The old route-handler name and
  the two legacy `*-sitemap.xml/route.ts` files are gone.

### Fixed

- `queryAllLocaleSlugs` now re-reads the doc with `locale: 'all'` so a
  localized slug field resolves to its real per-locale map. Previously it
  queried a single locale (which returns a plain string), so every
  hreflang alternate reused the current locale's slug.
- Removed a stray `console.log('render', …)` left in the
  `createCollectionPageExports` page-render hot path.

### Added

- **`slugField()` field factory** (exported from `/fields` and
  `/core-fields`) — the shared slug field used by the Pages / Posts
  collections, extracted so it's reusable and configurable: `localized`
  (default `true`) and `nested` (allow the `_` divider) options.
- **Nested (hierarchical) slugs.** `createCollectionPageExports({ nested: true })`
  joins the catch-all `[...slug]` segments with the `_` divider to form
  the stored slug (URL `/about/us` ⇄ stored `about_us`) and expands it
  back for URL building, hreflang alternates, and `generateStaticParams`.
  Pair with `createPagesCollection({ nested: true })` /
  `createWWWConfig({ nested: true })` to let the Pages slug field accept
  the `_` divider, and `createSitemapFile({ nested: { pages: true } })`
  for the sitemap. Default stays `false` (flat, hyphen-only slugs).
- **Extensible nav links.** `link({ extraFields })` appends host fields
  (e.g. a `description` or a `navHover` mega-menu group) to the link
  group. `createHeaderGlobal` / `createFooterGlobal` expose
  `navColumnLinkFields` and `navItemLinkFields` to thread these into the
  `navColumn` / `navItem` links without redefining the whole nav.
- `createRevalidateCollectionHook({ collectionSlug, urlPathPrefix?,
  sitemapTag?, localePrefix?, defaultLocale? })` — canonical
  revalidation factory for **all** collections (Pages, Posts,
  host-defined). The Posts collection is now wired through it
  with `urlPathPrefix: '/posts'`. Replaces the implicit per-collection
  hook logic.
- `revalidateTag('collection_<slug>_<id>', 'max')` — fired on every
  `afterChange` / `afterDelete` for every collection registered via
  the canonical hook, giving hosts a stable per-doc tag for
  fetch-cache and `unstable_cache` invalidation.
- `urlPrefixes` option on `createSitemapFile` — per-collection URL
  path prefix for the unified sitemap. Pass `{ posts: '/posts' }` for
  a collection mounted under a sub-route; Pages (root-mounted)
  needs no prefix.
- `localePrefix` + `defaultLocale` options on
  `createRevalidateCollectionHook` — lets the per-locale
  `revalidatePath` fan-out mirror the host's next-intl routing
  (`'always'`, `'as-needed'`, `'never'`). `'as-needed'` drops the
  prefix for the default locale (e.g. `/about` instead of
  `/en/about`).
- `nextCacheImport` — memoized `await import('next/cache')` shared
  by every revalidation hook, with safe fallback when the module
  isn't resolvable (e.g. outside a Next.js runtime during unit
  tests).
- `prefixFor(locale, defaultLocale, mode)` and `allLocales(config)`
  helpers under `src/render/_locale.ts`, shared by the revalidation
  hooks and `createSitemapFile` so the two never disagree on URL
  shape.

### Fixed

- `localePrefix: 'as-needed'` now actually produces `/about` for the
  default locale (previously it ignored the option and always
  emitted `/en/about`).
- `createSitemapHandler` references in the README and the
  `PAGES_SITEMAP_TAG` doc comment — both pointed at an export that
  never existed; corrected to `createSitemapFile`.
- Slug-rename revalidation now fans out across every declared locale
  (not just the request locale).
- `afterDelete` revalidation now fires the same `revalidatePath` +
  tag set as `afterChange` (previously inconsistent).
- Posts collection revalidation: before this change the Posts
  collection didn't ship a revalidation hook at all — saves and
  deletes left cached pages and the sitemap stale until the next
  manual revalidation.

### Deprecated

- `createRevalidatePageHooks()` — use
  `createRevalidateCollectionHook({ collectionSlug: 'pages',
  urlPathPrefix: '' })`. Kept for one release as a forwarding alias.
