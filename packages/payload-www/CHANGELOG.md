# Changelog

All notable changes to `@justanarthur/payload-www` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `queryAllDocs`, and with it `generateSitemap` and `generateStaticParams` from
  `createCollectionPageExports`, returns every document again. It passed no limit to
  `findIds`, so Payload's default `limit: 10` applied, and sitemaps and prerendered paths
  stopped at 10 documents per collection and locale.
- Unknown slugs return HTTP 404 again under `cacheComponents`. The page looked up the
  document and called `notFound()` inside its Suspense boundary. By then the shell had
  already streamed with status 200, so Next could only add `noindex`, a soft 404. The lookup
  now runs before the boundary. Slugs from `generateStaticParams` still prerender. Next
  serves any other slug as a blocking render, so a missing document gets a real 404 and a
  document published after the build renders on its first request. The `fallback` dep now
  wraps only the rendered document. Add `export const instant = false` next to the page
  exports to tell Next's dev-time instant validation that the route blocks on purpose.
  With `partialPrefetching: true`, Next still serves the layout shell for slugs it did not
  prerender, so those slugs still get a soft 404.
- `generateStaticParams` from `createCollectionPageExports` now accepts the plain params
  object Next passes it. It was typed with `NextPageProps`, whose `params` is a `Promise`, so
  every page that re-exported it failed `tsc` against Next's generated route validator
  (TS2344, "Types of property 'params' are incompatible"). Its `params` now takes the plain
  object or a promise of it, and pages no longer need a cast.
- Draft-only documents are no longer public. In 2.x, the cached query getters called the
  `@pro-laico/payload-revalidate` finders without `overrideAccess`, so the Local API default
  of `true` skipped the collection's read access. A document that was never published
  therefore rendered with a 200 and showed up in `generateStaticParams`, sitemaps and hreflang
  alternates. The 1.x behaviour is back: public reads (`queryDocBySlug`, `queryDocByID`
  without `draft`, `queryAllDocs`, `queryAllLocaleSlugs`) pass `overrideAccess: false`, so
  `authenticatedOrPublished` filters them to published documents. Draft reads keep
  `overrideAccess: true`. `queryGlobal` still skips access, as it did in 1.x.
- `next` is no longer a runtime dependency, only a peer (`^16.2.6`). It was also pinned in
  `dependencies` at `16.3.4`, so a host on a different Next version installed a second copy
  under the lib, and `next/cache` in the query helpers could run against a different Next
  instance than the app.

### Changed

- Requires `@justanarthur/payload-plugin-translator` `^3.3.1`, which stops concurrent
  translate jobs from writing one locale's translations into another locale's rows (the
  default-locale document could end up holding another language's titles and slugs after a
  bulk translation run) and refuses to translate into the default locale altogether.
- Requires `@justanarthur/payload-plugin-seo` `^4.1.1`, which declares `next` as a peer
  instead of resolving it by accident of hoisting.

## [2.2.0] - 2026-09-16

### Changed

- Consumes the widened `SanitizedConfig | Promise<SanitizedConfig>` config argument on
  `@justanarthur/payload-plugin-seo`'s `createSiteDefaults` / `RootJsonLdProps`. Compiled
  output is unchanged from 2.1.0; this is a version bump for the seo minor that ships in
  the same release.

## [2.0.0] - 2026-09-15

### Breaking changes

- `createCollectionPageExports` / `createRootLayoutExports` take `_payloadConfig` instead of
  `config`, and seed the cache themselves.
- `@pro-laico/core` and `@pro-laico/payload-revalidate` are required peer dependencies.
- `cacheComponents: true` is required in the host's `next.config.ts`.
- The `@justanarthur/payload-www/cache-keys` subpath is gone, along with `safeCacheTag` and
  the seven `create*CacheKey` helpers.
- `createWWWCollectionGlobal` no longer installs revalidation hooks.
- Peer ranges move to Next 16.3 / React 19.2 / Payload 3.88 / next-intl 4.14, and
  `@justanarthur/payload-plugin-seo` to `^4.0.0`.

### Added

- **`pagePathPrefix` can be localized.** It now accepts a `Record<locale, string>` alongside
  the existing `string`, so a host serving localized routes (`/posts/x` in English,
  `/sk/prispevky/x` in Slovak) gets canonical and hreflang URLs that match the URLs it
  actually serves, instead of the default-locale segment for every locale. Locales missing
  from the record fall back to `routing.defaultLocale`, and the sitemap *index* route
  (`/<prefix>/sitemap.xml`) keeps using the default locale's segment because it addresses a
  route rather than a page. Passing a plain string behaves exactly as before.

- **Caching via `@pro-laico/core` + `@pro-laico/payload-revalidate`.** Both packages are
  peer deps of `@justanarthur/payload-www` (resolved through `peerDependencies`, not `file:`
  links — install at the workspace root with `bun install`). The lib's cached query getters
  wrap the pro-laico finders (`findDoc`, `findGlobal`, `findIds`, `findDocByID`), so the
  tags the revalidation plugin reads match the tags the lib emits — hand-spelling tags
  silently no-ops.
- **`queryDocBySlug`, `queryGlobal`, `queryAllDocs`, `queryAllLocaleSlugs`, `queryDocByID`**
  are now `'use cache'` + `cacheLife('weeks')` scopes (Next 16 cacheComponents, 5 m stale /
  1 w revalidate / 30 d expire via the built-in `'weeks'` profile). Exported from
  `@justanarthur/payload-www/metadata`. `depth` defaults to `0` (relations stay as ids) —
  hosts that need populated relations pass `depth` explicitly.
- **`seedPayloadCache({ config })`** — singleton seed that initializes the pro-laico cache
  helpers from the host's Payload config. Hosts call it once per process before any query
  getter fires. `createCollectionPageExports` and `createRootLayoutExports` call it
  automatically; custom layouts call it directly.
- **`tagsFor` re-exported from `@justanarthur/payload-www/metadata`** (passthrough of
  `@pro-laico/payload-revalidate#tagsFor`) so hosts can build manual cache keys without
  importing the peer directly.
- **`generateStaticParams` now returns every (locale, slug) pair across `routing.locales`**
  (was: default-locale-only). Each pair is statically pre-rendered; Next 16's static shell
  can build it without depending on the layout's locale fan-out.
- **SEO plugin routes its fetches through the lib's cached getters.** `createSiteDefaults`
  (site-wide SEO defaults) and `RootJsonLd` (Organization / WebSite JSON-LD) in
  `@justanarthur/payload-plugin-seo` now call `seedPayloadCache` once and read through the
  lib's `'use cache'` getters instead of issuing their own Payload lookups.
- **`createWWWCollectionGlobal` accepts an optional `useAsTitle`.** Pages and Posts pass
  `'title'`, so the admin list shows the document title instead of its id, and — only for
  `'title'` — sets `defaultColumns` to `[title, slug, publishedAt]`. Collections that omit
  the option get no `admin` block at all, so existing callers are unaffected.

### Changed

- **Stack upgrade to Next 16.3 + React 19.2 + Payload 3.88 + next-intl 4.14 + TypeScript 7.**
  Runtime deps bumped in `dependencies` and `peerDependencies` of every package; dev deps
  (including `typescript` → `^7.0.2`, `vitest` → `4.0.18`) bumped in the lib and each plugin.
  `bun.lock` regenerated from scratch.
- **`createWWWCollectionGlobal` no longer installs revalidation hooks.** The
  `afterChange` / `afterDelete` block is gone — hosts install their own revalidation plugin
  (`@pro-laico/payload-revalidate` or equivalent) and wire its tag invalidation through the
  pro-laico finders the lib's query layer now calls. `populatePublishedAt` remains wired as
  a `beforeChange` and is still exported from the lib.
- **`<Activity>` wraps rendered header / footer in `createRootLayoutExports`.** Instant
  navigations can now defer the off-screen activity until the user scrolls to it. Default
  `mode="visible"`.

### Removed

- **`safeCacheTag`** and the in-tree tag vocabulary (`createCollectionCacheKey`,
  `createAliasCacheKey`, `createListCacheKey`, `createJoinCacheKey`, `createGlobalCacheKey`,
  `createAllCacheKey`, `createDraftCacheKey`, `prefixedTag`). Hand-spelled tags no longer
  match anything — the lib now uses the tags `@pro-laico/payload-revalidate` already emits
  via `findDoc` / `findGlobal`.
- **`@justanarthur/payload-www/cache-keys` subpath export** (and the underlying
  `cacheKeys.ts`) — gone, since there is no in-tree vocabulary to export.
- **`defaultPluginsConfigs.revalidate` passthrough slot** on `WWWInputConfig` — the in-lib
  revalidation composer no longer exists, so the slot has nothing to wrap.
- **`cacheLife('weeks')` profile** — every cached getter now uses the built-in
  `cacheLife('weeks')`. No custom `cacheLife` config entry needed.

### Required

- **`cacheComponents: true` in `next.config.ts`** is now required. The `'use cache'` scopes
  in the query layer depend on Next 16's cacheComponents pipeline. Already on in the demo's
  `next.config.ts`; new hosts must add it.

### Fixed

- **`generateMetadata` short-circuits on a locale `routing` does not serve.** Any
  `/[locale]/...` segment — including bot-probed junk — ran a full document fetch and then
  emitted alternates for a locale the site has no routes for. Unknown locales now return
  empty metadata before the fetch.

## [1.4.2] - 2026-09-12

### Fixed

- **`buildAlternates` can no longer emit `undefined` inside a URL.** The canonical is
  computed independently of the alternates map, and `x-default` is only set when the default
  locale survives.

## [1.4.1] - 2026-09-12

### Fixed

- **Nested slugs are now split when building URLs.** `buildLocalizedPath` emitted the stored
  slug verbatim, so a page saved as `products_online-reservations` declared
  `https://site/products_online-reservations` as its canonical, sitemap `<loc>` and hreflang
  target while the route actually served `/products/online-reservations`. Both forms resolve,
  so this published a canonical that nothing on the site links to. The new `slugToPath`
  helper (exported from `render/metadata/slug`) applies the `_` → `/` nesting divider that
  `slugField` already documents.

- **Untranslated locales no longer claim the collection listing as their alternate.** When a
  doc had no slug in a locale the blank fell through the path template and produced the
  listing URL — every untranslated post advertised `hreflang="cs" → /cs/posts`, so hundreds
  of documents pointed at the same page and the hreflang cluster was discarded.
  `buildLocalizedPaths` now omits those locales. A blank slug is still honoured when the
  default locale is also blank, which is how the home page is addressed.

## [1.4.0] - 2026-09-11

### Added

- **`mcpPlugin` re-enabled in the default plugin set.** Reverses the 1.0.0 "Removed" entry —
  the official `@payloadcms/plugin-mcp` is now wired into the composer by default, with
  `find`, `create`, `update`, `delete` enabled for every collection and `find`, `update` for
  every global. Hosts tune via `defaultPluginsConfigs.mcp` on `WWWInputConfig`.

- **New public subpath `@justanarthur/payload-www/mcp`** re-exports `mcpPlugin` and
  `MCPPluginConfig` from `@payloadcms/plugin-mcp` for hosts that want to register the plugin
  manually (e.g. when not going through `createWWWConfig`).

- **`generateMeta` emits a title again when there is no meta and no fallback.** `45e4ae6`
  swapped the final `'Not found'` candidate for `fallback.name`, which left not-found and
  error pages with `{ title: undefined }`. Both candidates are now present, and `name` is
  part of the `fallback` type instead of a bracket-access escape hatch.

### Security

- With MCP enabled by default, every collection and global is mutable through `/api/mcp`
  (Streamable HTTP + SSE). Hosts that need a tighter surface should either pass
  `defaultPluginsConfigs: { mcp: (d) => ({ ...d, disabled: true }) }` to disable it outright,
  or override `collections` / `globals` per-entity to drop the write ops. Authentication is
  still required for all MCP access — the plugin does not bypass `req.user` checks.

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