# Changelog

All notable changes to `@justanarthur/payload-www` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-07-07

First stable release. The composer / collections / globals / page-renderers / sitemap surface is
locked; future changes follow semver.

### Breaking changes

- **`createWWWConfig()` takes no arguments.** Locales come from your Payload `localization` config;
  blocks / collections / globals / plugins are passed through the `WWWInputConfig` arg of
  `withWWWConfig(...)`. The previous `createWWWConfig({ locales, blocks, routing, ... })` signature
  was removed.
- **`defaultPluginsConfigs` replaces `defaultPlugins` callback.** Tune the lib's default plugin set
  via `defaultPluginsConfigs: { seo, imageHash, translator, mcp }` on `WWWInputConfig` — each
  entry is either a `(defaults) => override` or a replacement value. The old
  `defaultPlugins: (defaults) => defaults.filter(...)` callback is gone.
- **Pages / Posts `slug` is localized by default.** The slug field is `localized: true` (one slug
  per locale — `/about` in `en`, `/o-nas` in `sk`), stored in the collection's `_locales` table.
  Hosts on a single shared slug must pass `slugField({ localized: false })` (or override the field)
  and migrate the `slug` column into `<collection>_locales`.
- **`slugField()` is exported from `/fields` only** — the previous `/core-fields` subpath is gone.
- **Revalidation: only `createRevalidateCollectionGlobalHook()` ships.** It fires
  `revalidateTag('<slug><slug>_<locale>', 'max')` (collections) or
  `revalidateTag('<globalSlug>_<locale>', 'max')` (globals). There is no per-locale `revalidatePath`
  fan-out, no `createRevalidateCollectionHook({...})` factory, no `createRevalidatePageHooks()`,
  no `createRevalidateGlobalHook()` — hosts that need URL fan-out wire their own hook on top of
  this one.
- **Sitemap: only `createSitemapFromCollections` ships.** It is called from
  `app/(frontend)/sitemap.ts` and returns a `MetadataRoute.Sitemap` producer. The previous
  `createSitemapFile` / `createSitemapHandler` names are gone — do not import them.
- **Removed `static-pages` system pages from the default composer output.** Hosts that need 404 /
  500 pages build their own collection via `createWWWCollectionGlobal({...}, { slug:
  'static-pages', renderPath: '...', isDraft: false })` and mount a normal
  `createCollectionPageExports` against it. There is no `createStaticPagesCollection` /
  `createStaticPageExports` helper.

### Added

- **`RootJsonLd` component** auto-injected into the root layout by `createRootLayoutExports` when
  you pass `getServerSideURL`. Renders the SEO plugin's site-wide `Organization` / `WebSite` /
  `Product` JSON-LD as the first child of `<html>` so it ships in the initial HTML for crawlers.
- **`createRootLayoutExports` factory** (from `/render-pages`) wires the `[locale]/layout.tsx`
  route: locale validation, `setRequestLocale`, header + footer render, `NextIntlClientProvider`,
  optional `<RootJsonLd>`. Deps accept `getServerSideURL`, `providers`, and `htmlAttrs`.
- **`createCollectionPageExports({ slugShape })`** — `'single'` (default) for `[slug]` (Posts,
  static-pages) and `'catch-all'` for `[[...slug]]` (Pages). Drives `generateStaticParams` and
  slug segmentation.
- **`createWWWCollectionGlobal(fields, { slug, renderPath, isGlobalConfig?, isDraft? })`** —
  generic factory used internally for Pages / Posts / static-pages. Hosts can use it directly for
  custom collections. Sets access (`anyone` for system pages, `authenticatedOrPublished` for
  drafts), wires the revalidation hook and `populatePublishedAt` `beforeChange`.
- **Nav-link extension hook:** `link({ extraFields })` lets hosts append fields (e.g. `description`
  or a `navHover` mega-menu group) to the link group. `createHeaderGlobal` /
  `createFooterGlobal` expose `navColumnLinkFields` / `navItemLinkFields` to thread these into the
  `navColumn` / `navItem` blocks without redefining the whole nav.
- **Open Graph image attributes** are wired through the SEO plugin's `next-metadata` subpath and
  read by `generateMeta` for every page.
- **`createPostsCollection` ships an `afterChange` / `afterDelete` revalidation hook** (it didn't
  before — saves and deletes used to leave cached pages and the sitemap stale).

### Fixed

- Block render components declared via `custom.path` are now auto-registered in the admin importMap.
  The composer used to read `admin.custom.path` for blocks — inconsistent with collections / globals
  (which use `custom.path`) — so blocks with a top-level `custom.path` were silently skipped and
  didn't render. Now reads `custom.path` with `admin.custom.path` as a fallback.
- `queryAllLocaleSlugs` now re-reads the doc with `locale: 'all'` so a localized slug field
  resolves to its real per-locale map. Previously it queried a single locale (which returns a
  plain string), so every hreflang alternate reused the current locale's slug.
- `createRevalidateCollectionGlobalHook` swallows the `static generation store missing` error so
  it doesn't crash the seed-script path that runs outside Next.js.
- `createWWWCollectionGlobal` now grants `anyone` read access when `isDraft: false` — system
  pages like 404 / 500 need to be publicly fetchable even before they're "published".
- Slug-rename revalidation now fans out across every declared locale (not just the request locale).

### Changed

- `globals` / `collections` rename: the package now consistently uses **collections** as the
  umbrella term (collections + globals are both "config entities"). `createGlobalConfig` was
  folded into `createWWWCollectionGlobal({ isGlobalConfig: true, ... })`.
- Site-wide JSON-LD utilities were unified under `buildRootJsonLd` (Organization + WebSite +
  Product combined). Per-piece builders (`buildOrganizationLd`, `buildWebSiteLd`,
  `buildProductLd`) are still exported from `/metadata` for hosts that want them individually.
- SEO plugin's `meta` field now includes `keywords` and the localized field support added by the
  SEO plugin's own 1.3.x line (see `@justanarthur/payload-plugin-seo` README for options).
- Build script now sets `NODE_ENV=production` before invoking `bunup`, fixing the silent
  `jsxDEV` runtime crash on Next.js production builds.

### Removed

- **`mcpPlugin` is no longer wired into the default plugin set.** Hosts that want it should
  register it themselves via `plugins: (defaults) => [...defaults, mcpPlugin({...})]`. The
  composer previously injected MCP for every collection and global by default; the default-on
  behaviour caused excessive admin-tool surface and has been disabled until the MCP integration
  settles.