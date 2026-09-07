# Changelog

All notable changes to `@justanarthur/payload-www` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **New public subpath `@justanarthur/payload-www/cache-keys`** exports the atomic tag vocabulary
  used by the lib's query layer (`createCollectionCacheKey`, `createAliasCacheKey`,
  `createListCacheKey`, `createJoinCacheKey`, `createGlobalCacheKey`, `createAllCacheKey`,
  `createDraftCacheKey`, `prefixedTag`). Hosts that install their own revalidation strategy
  (e.g. `@pro-laico/payload-revalidate`) MUST import from this subpath so the tags the lib
  emits via `cacheTag(...)` match the tags they revalidate. Hand-spelling tags silently no-ops.
- **`defaultPluginsConfigs.revalidate?: false | (<D>(d: D) => D)` passthrough slot** on
  `WWWInputConfig`. Hosts can disable the in-lib revalidation composer's pass-through entirely
  (returning `false`) or wrap the per-collection config (typed against the host's payload types).
  Default behaviour unchanged: the slot is omitted.

### Changed

- **Stack upgrade to Next 16.3 + React 19.2 + Payload 3.88 + next-intl 4.14 + TypeScript 7.**
  Runtime deps bumped in `dependencies` and `peerDependencies` of every package; dev deps
  (including `typescript` → `^7.0.2`, `vitest` → `4.0.18`) bumped in the lib and each plugin.
  `bun.lock` regenerated from scratch.
- **`render/metadata/query.ts` migrated to the cacheComponents atomic model.** Each cached
  query (`queryDocBySlug`, `queryGlobal`, `queryAllDocs`) now emits the same tag vocabulary the
  revalidation plugin reads — no more `withUnstableCache`, no more implicit revalidate windows.
  Cache invalidation is purely tag-based. `queryAllLocaleSlugs` stays uncached (caching would
  freeze the hreflang map across all renders). `depth` defaults to `0` (relations stay as ids) —
  hosts that need populated relations pass `depth` explicitly. This is a real behaviour break;
  see the migration note in the README.
- **`createWWWCollectionGlobal` no longer installs revalidation hooks.** The `afterChange` /
  `beforeChange` / `afterDelete` block that wired `populatePublishedAt` and tag-based cache
  invalidation into every collection is gone. Hosts install their own revalidation plugin
  (the demo ships a minimal reference at `demo/src/plugins/revalidate/index.ts`; production
  hosts should use `@pro-laico/payload-revalidate` or equivalent). The `populatePublishedAt`
  hook remains exported from the lib for hosts that want to keep the published-at default.
- **`<Activity>` wraps rendered header / footer in `createRootLayoutExports`.** Instant
  navigations can now defer the off-screen activity until the user scrolls to it. Default
  `mode="visible"`.
- **`cacheLife('weeks')`** is the chosen profile for the lib's cached query layer
  (built-in Next 16: 5 m stale / 1 w revalidate / 30 d expire). No custom `cacheLife` config
  entry required.

### Fixed

- **Nested slugs are now split when building URLs.** `buildLocalizedPath` emitted the stored slug
  verbatim, so a page saved as `products_online-reservations` declared
  `https://site/products_online-reservations` as its canonical, sitemap `<loc>` and hreflang target
  while the route actually served `/products/online-reservations`. Both forms resolve, so this
  published a canonical that nothing on the site links to. The new `slugToPath` helper (exported
  from `render/metadata/slug`) applies the `_` → `/` nesting divider that `slugField` already
  documents.

- **Nested slugs are now split when building URLs.** `buildLocalizedPath` emitted the stored slug
  verbatim, so a page saved as `products_online-reservations` declared
  `https://site/products_online-reservations` as its canonical, sitemap `<loc>` and hreflang target
  while the route actually served `/products/online-reservations`. Both forms resolve, so this
  published a canonical that nothing on the site links to. The new `slugToPath` helper (exported
  from `render/metadata/slug`) applies the `_` → `/` nesting divider that `slugField` already
  documents.
- **Untranslated locales no longer claim the collection listing as their alternate.** When a doc had
  no slug in a locale the blank fell through the path template and produced the listing URL — every
  untranslated post advertised `hreflang="cs" → /cs/posts`, so hundreds of documents pointed at the
  same page and the hreflang cluster was discarded. `buildLocalizedPaths` now omits those locales. A
  blank slug is still honoured when the default locale is also blank, which is how the home page is
  addressed.
- **`buildAlternates` can no longer emit `undefined` inside a URL.** The canonical is computed
  independently of the alternates map, and `x-default` is only set when the default locale survives.

### Added

- **`mcpPlugin` re-enabled in the default plugin set.** Reverses the 1.0.0 "Removed" entry — the
  official `@payloadcms/plugin-mcp` is now wired into the composer by default, with `find`,
  `create`, `update`, `delete` enabled for every collection and `find`, `update` for every global.
  Hosts tune via `defaultPluginsConfigs.mcp` on `WWWInputConfig` (see `@payloadcms/plugin-mcp` for
  the full options surface, including `disabled`, `mcp.prompts`, `mcp.resources`, `mcp.tools`,
  `experimental`, and `overrideAuth`).
- **New public subpath `@justanarthur/payload-www/mcp`** re-exports `mcpPlugin` and `MCPPluginConfig`
  from `@payloadcms/plugin-mcp` for hosts that want to register the plugin manually (e.g. when not
  going through `createWWWConfig`).

### Changed

- **Security note:** with MCP enabled by default, every collection and global is mutable through
  `/api/mcp` (Streamable HTTP + SSE). Hosts that need a tighter surface should either pass
  `defaultPluginsConfigs: { mcp: (d) => ({ ...d, disabled: true }) }` to disable it outright, or
  override `collections` / `globals` per-entity to drop the write ops. Authentication is still
  required for all MCP access — the plugin does not bypass `req.user` checks.

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