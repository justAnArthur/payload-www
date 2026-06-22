# @justanarthur/payload-www

Reusable Payload CMS website template. Wires collections, globals,
blocks, fields, access, hooks, metadata (JSON-LD, hreflang), and
Next.js page renderers behind a single `createWWWConfig({ locales, blocks })`
composer. The lib consumes your [next-intl](https://next-intl.dev) routing
config so locale validation, URL shape, hreflang alternates, and the
language switcher share a single source of truth with the rest of your app.

## What's inside

- **Composer** — `createWWWConfig({ locales, blocks, defaultPlugins? })` returns `{ withWWWConfig }`. One composer call is enough for the most common cases.
- **Collections** — `Pages` (title, blocks tab, slug, drafts, revalidation hook), `Posts` (title, excerpt, richText, drafts, revalidation hook), `StaticPages` (system pages — 404, 500, search-empty, … — addressed by a `kind` discriminator, not a slug)
- **Globals** — `Header` and `Footer` (both `nav` blocks with `navColumn` / `navItem`)
- **Default render components** — `PagesPage`, `HeaderPage`, `FooterPage` Server Components. Override any of them by setting a different `custom.path` on the collection / global.
- **LivePreviewListener** — built in. The lib's `createCollectionPageExports` default page renders it (via `React.lazy` so the server dist stays free of `'use client'` imports) whenever Next.js draft mode is on. Hosts get live preview automatically — no opt-in required. The component itself is also exported from `/render-components` for hosts that want to mount it elsewhere.
- **Hooks** — `createRevalidateCollectionHook(opts)` (canonical factory for **all** collections: Pages, Posts, host-defined; per-locale `revalidatePath` fan-out + `revalidateTag('collection_<slug>_<id>', 'max')` + sitemap tag, with a `pathMode: 'tag-only'` mode for collections without a URL like `staticPages`), `createRevalidatePageHooks()` (deprecated alias for Pages preset), `createRevalidateGlobalHook(slug)` (per-locale tag for globals)
- **Access** — `anyone`, `authenticated`, `authenticatedOrPublished`
- **Fields** — `link`, `linkGroup` (with `disableLabel` / `appearances` / `localized` / `relationTo` / `overrides` options)
- **Metadata** — `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildHreflangAlternates`, slug transforms, `queryDocBySlug` / `queryAllDocs` / `queryAllLocaleSlugs`
- **Pages** — `createCollectionPageExports` (Next.js App Router render factory), `addCollectionsToSitemap`. Supports a `showcase` sidebar and a `homeExtras` callback for the home route.
- **Components** — `LivePreviewListener`, `RenderBlocks`, `PageShowcase` (sidebar layout for demos / previews), `LocaleSwitcher` (server-renderable nav built from the page's hreflang alternates)
- **Route handlers** — `createPreviewHandler` (from the `/render-utils` subpath). The Next.js sitemap convention ships as `createSitemapFile` (same subpath) — it's a `MetadataRoute.Sitemap` factory for `app/(frontend)/sitemap.ts`, not a route handler, and it's `localePrefix`-aware.
- **Utils** — `getFromImportMap`, `generateImportName`, `renderCollectionModule`
- **Seed / Test** — `createBaseSeed` (publishes by default — pass `status: 'draft'` to keep a doc as a draft), `createTestPayload`

## Quick start

### 1. Wire the composer

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { createWWWConfig } from '@justanarthur/payload-www/with-www-config'
import { MyCtaBlock, MyHeroBlock, MyRichTextBlock } from './blocks'

const { withWWWConfig } = createWWWConfig({
  locales: ['en', 'sk', 'de'],
  blocks: [MyCtaBlock, MyHeroBlock, MyRichTextBlock]
})

export default buildConfig(
  withWWWConfig({
    collections: [],   // optional extra collections
    globals: [],      // optional extra globals
    // ...rest of your config
  })
)
```

`withWWWConfig` injects `Pages`, `Header`, and `Footer` plus the lib's
default plugin set (seoPlugin, imageHashPlugin, translator). Use the
`defaultPlugins` callback to drop or extend the list:

```ts
createWWWConfig({
  locales: ['en', 'sk', 'de'],
  blocks: [MyCtaBlock],
  defaultPlugins: (defaults) => defaults.filter((p) => p !== translator)
})
```

### 2. Define your next-intl routing

The lib reads the same routing config next-intl uses, so URL shape,
locale validation, hreflang alternates, and the language switcher share
a single source of truth:

```ts
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'uk'],
  defaultLocale: 'en',
  // 'as-needed' means `/about` for the default locale and
  // `/uk/about` for the others — the lib mirrors this in
  // hreflang alternates and the language switcher.
  localePrefix: 'as-needed',
  labels: { en: 'English', uk: 'Українська' }
})
```

### 3. Page exports

```ts
// app/(frontend)/[locale]/page.tsx — home
// app/(frontend)/[locale]/[...slug]/page.tsx — catch-all
import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'
import { importMap } from '@/app/(payload)/admin/importMap.js'
import { routing } from '@/i18n/routing'

import { getServerSideURL } from '@/utilities/getURL'

const generateMeta = async ({ doc }) => ({ title: doc?.title })

const { default: Page, generateMetadata, generateStaticParams } =
  createCollectionPageExports(
    { config: configPromise, importMap, routing },
    { getServerSideURL, generateMeta }
  )

export default Page
export { generateMetadata, generateStaticParams }
```

The lib auto-mounts its `LivePreviewListener` (loaded via `React.lazy`
so the server dist stays free of `'use client'` imports) whenever
Next.js draft mode is on. No opt-in required.

#### Showcase sidebar + home extras

The home route can render inside a `<PageShowcase>` two-column layout
(sidebar with metadata, JSON-LD, and a language switcher) and append a
`homeExtras` block (recent pages, recent posts, etc.):

```ts
const { default: Page, generateMetadata, generateStaticParams } =
  createCollectionPageExports(
    { config: configPromise, importMap, routing },
    {
      getServerSideURL,
      generateMeta,
      showcase: { enabled: true },                 // wrap in <PageShowcase>
      homeExtras: async ({ locale }) => {
        const { pages, posts } = await fetchRecent(locale)
        return <RecentLists pages={pages} posts={posts} />
      }
    }
  )
```

`<PageShowcase>` and `<LocaleSwitcher>` are also exported individually
(from `/render-components` and `/render-utils` respectively) for hosts
that want to drop them in their own layouts.

### 4. Route handlers — preview + sitemap

```ts
// src/proxy.ts (replaces the deprecated src/middleware.ts)
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
export default createMiddleware(routing)
export const config = {
  matcher: ['/', '/((?!api|_next|_vercel|admin|next|.*\\..*).*)']
}
```

```ts
// app/(payload)/next/preview/route.ts
import { createPreviewHandler } from '@justanarthur/payload-www/render-utils'
export const GET = createPreviewHandler()
```

```ts
// app/(frontend)/sitemap.ts
import { createSitemapFile } from '@justanarthur/payload-www/render-utils'
import configPromise from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'

// One file, all collections, all locales — Next.js serves it at
// /sitemap.xml. The Pages collection's `afterChange` hook invalidates
// the `pages-sitemap` tag the factory reads from, so edits refresh
// the sitemap automatically.
export default createSitemapFile({
  collections: ['pages', 'posts'],
  config: configPromise,
  getServerSideURL,
  // 'as-needed' makes the default locale render without a prefix
  // (`/about`), other locales prefixed (`/uk/about`). Matches the
  // host's next-intl `localePrefix` so sitemap URLs match the
  // actual route shape.
  localePrefix: 'as-needed',
  // Collections mounted under a sub-route (here: Posts at
  // `/posts/[...slug]`) need their sitemap URLs prefixed so they
  // match the real route. Pages live at the root, so no prefix.
  urlPrefixes: { posts: '/posts' }
})
```

The Pages collection's `afterChange` hook revalidates the
`pages-sitemap` tag the sitemap factory reads from.

### 5. System pages (404, 500, search-empty, …)

The lib ships a `StaticPages` collection for pages that don't map to a
slug-based URL. One row per `kind` discriminator (`'not-found'`,
`'server-error'`, `'search-empty'`, `'offline'`). The host's route
file fetches the row and renders it via `createStaticPageExports` —
the same shape as `createCollectionPageExports`, minus the
metadata / sitemap / static-params plumbing (system pages have no
URL):

```ts
// app/(frontend)/[locale]/not-found.tsx
import configPromise from '@payload-config'
import { createStaticPageExports } from '@justanarthur/payload-www/render-pages'
import { importMap } from '@/app/(payload)/admin/importMap.js'

const { default: NotFound } = createStaticPageExports({
  config: configPromise,
  importMap,
})

export default NotFound
```

`createStaticPageExports` reads the active locale via
`getLocale()` from `next-intl/server` (Next.js passes no props to
not-found components, so the URL-segment locale comes from the
request config — middleware sets it, the host's `i18n/request.ts`
falls back to `defaultLocale` for invalid values). Adding a
`server-error.tsx` is the same shape with `kind: 'server-error'`.

Editors create the row in admin (under the `System` group), pick a
`kind`, and populate the `blocks` tab using the same block set you
passed to `createWWWConfig({ blocks })`. The `title` field is
admin-only — not rendered. `kind` is `unique`, so the database
enforces one row per system page. Drafts + autosave mirror `pages`.
The translator plugin includes `'static-pages'` in its default
`collections` list, so SK content fills automatically when you expand
`localization.locales`.

Revalidation uses the `pathMode: 'tag-only'` branch of
`createRevalidateCollectionHook` — no URL fan-out (system pages have
no slug), but the per-id tag (`collection_static-pages_<id>`) and the
collection-wide tag (`static-pages` via the `sitemapTag` override)
fire on every change.

## Public API

The root import gives you the full surface:

```ts
import {
  createWWWConfig,           // composer (default export)
  createPagesCollection,     // collection factories
  createPostsCollection,
  createStaticPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,       // admin.preview URL builder
  HOME_PAGE_SLUG, PAGES_SLUG, POSTS_SLUG, STATIC_PAGES_SLUG,
  link, linkGroup,           // fields
  appearanceOptions,
  anyone, authenticated,     // access
  authenticatedOrPublished,
  createRevalidatePageHooks, // hooks
  createRevalidateCollectionHook, // hooks (canonical; createRevalidatePageHooks is a deprecated Pages preset)
  createRevalidateGlobalHook,
  buildArticleLd,            // metadata
  buildBreadcrumbsLd,
  buildOrganizationLd,
  buildHreflangAlternates,
  queryDocBySlug, queryAllDocs, queryAllLocaleSlugs,
  segmentsToStoredSlug, segmentsToUrlPath, storedSlugToSegments,
  getUrlPath, buildCanonicalUrl,
  createCollectionPageExports,  // page factory
  addCollectionsToSitemap,
  LivePreviewListener, RenderBlocks,  // components
  PageShowcase, LocaleSwitcher,       // demo / preview components
  getFromImportMap, generateImportName, renderCollectionModule,  // utils
  createBaseSeed, createTestPayload,  // dev
  // constants
  PAGES_RENDER_PATH, HEADER_RENDER_PATH, FOOTER_RENDER_PATH, PAGES_SITEMAP_TAG
} from '@justanarthur/payload-www'
```

Subpath imports:

| Subpath                          | What's there                                                |
|----------------------------------|-------------------------------------------------------------|
| `@justanarthur/payload-www`      | root: `LivePreviewListener` only (client-safe)              |
| `@justanarthur/payload-www/server` | everything else                                          |
| `@justanarthur/payload-www/with-www-config` | `createWWWConfig` (default export)                |
| `@justanarthur/payload-www/collections`    | `createPagesCollection`, `createHeaderGlobal`, `createFooterGlobal` |
| `@justanarthur/payload-www/globals`        | `createHeaderGlobal`, `createFooterGlobal`        |
| `@justanarthur/payload-www/hooks`          | revalidation hooks                                |
| `@justanarthur/payload-www/pages`          | `createCollectionPageExports`, `addCollectionsToSitemap` |
| `@justanarthur/payload-www/render-pages`   | same as `/pages` + `PagesPage` / `HeaderPage` / `FooterPage` / `PageShowcase` |
| `@justanarthur/payload-www/render-utils`   | `createPreviewHandler`, `createSitemapFile`, `LivePreviewListener`, `LocaleSwitcher` |
| `@justanarthur/payload-www/render-components` | `LivePreviewListener`                            |
| `@justanarthur/payload-www/render-metadata` | JSON-LD + hreflang + slug utilities               |
| `@justanarthur/payload-www/metadata`       | same as `/render-metadata`                        |
| `@justanarthur/payload-www/fields`         | `link`, `linkGroup`, `appearanceOptions`          |
| `@justanarthur/payload-www/access`         | `anyone`, `authenticated`, `authenticatedOrPublished` |
| `@justanarthur/payload-www/blocks`         | `RenderBlocks`                                    |
| `@justanarthur/payload-www/components`     | `LivePreviewListener`                             |
| `@justanarthur/payload-www/utils`          | `getFromImportMap`, `generateImportName`, `renderCollectionModule` |
| `@justanarthur/payload-www/seed`           | `createBaseSeed`                                  |
| `@justanarthur/payload-www/test`           | `createTestPayload`                               |
| `@justanarthur/payload-www/data-seed`      | same as `/seed`                                   |
| `@justanarthur/payload-www/data-test`      | same as `/test`                                   |
| `@justanarthur/payload-www/data-collections` | collection factories                             |
| `@justanarthur/payload-www/config`         | `createWWWConfig` (default export)                |
| `@justanarthur/payload-www/imagehash`      | `imageHashPlugin` re-export                       |
| `@justanarthur/payload-www/translator`     | `translator` re-export                            |

## Configuration reference

`createWWWConfig({ ... })`:

| Option           | Type                              | Required | Description                                                            |
|------------------|-----------------------------------|----------|------------------------------------------------------------------------|
| `locales`        | `string[]`                        | yes      | Locale list. First entry is the default locale (translation source).   |
| `routing`        | `PageRouting`                     | no       | The host's next-intl `defineRouting({...})` result. When passed, `locales`, `defaultLocale`, and `localePrefix` are read from this object. `localePrefix` accepts both the simple string form and next-intl's verbose `{ mode, prefixes? }` shape (normalized internally). |
| `blocks`         | `Block[]`                         | yes      | Blocks the Pages collection accepts.                                   |
| `linkRelationTo` | `string[]`                        | no       | Collection slugs the Header / Footer nav links can reference. Default: `['pages']`. |
| `registerPosts`  | `boolean`                         | no       | Register the lib's Posts collection. Default `true`. |
| StaticPages      | —                                 | yes      | Always registered (every site has 404). Hosts filter it out in `collections:` to opt. |
| `defaultPlugins` | `(defaults: Plugin[]) => Plugin[]`| no       | Final say on the default `[seoPlugin, imageHashPlugin, translator]` list. |

`createRevalidateCollectionHook({ collectionSlug, urlPathPrefix?, sitemapTag?, localePrefix?, defaultLocale? })`:

| Option           | Type                              | Description                                                            |
|------------------|-----------------------------------|------------------------------------------------------------------------|
| `collectionSlug` | `string`                          | Required. The collection's slug. Used in the `collection_<slug>_<id>` tag. |
| `urlPathPrefix`  | `string`                          | URL path prefix. `''` for root-mounted (Pages), `'/posts'` for Posts. Default `''`. |
| `sitemapTag`     | `string \| false`                 | Tag fired alongside paths. Default `${collectionSlug}-sitemap`. Pass `false` to opt out. |
| `localePrefix`   | `'always' \| 'as-needed' \| 'never'` | Mirrors next-intl. Default `'always'`. Set to `'as-needed'` (with `defaultLocale`) when the host uses as-needed routing. |
| `defaultLocale`  | `string`                          | Default locale for `localePrefix: 'as-needed'`. Falls back to `req.payload.config.localization.defaultLocale`. |
| `pathMode`       | `'url' \| 'tag-only'`             | Default `'url'` — fans out `revalidatePath` per locale × slug. Set `'tag-only'` for collections without a URL (e.g. `staticPages`); the hook still fires the per-id tag (`collection_<slug>_<id>`) and the collection-wide tag (via `sitemapTag`). |

The canonical hook for all collections — Pages, Posts, and host-defined. Pages internally uses this with `collectionSlug: 'pages'`, `urlPathPrefix: ''`. Fires `revalidatePath` for **every** declared locale (not just the request locale), handles slug renames while published, fires `revalidateTag('collection_<slug>_<id>', 'max')` for hosts that cache by id, and respects `req.context.disableRevalidate` for seed scripts.

`createRevalidatePageHooks()` is a deprecated alias for `createRevalidateCollectionHook({ collectionSlug: 'pages', urlPathPrefix: '' })` — kept for backward compat with hosts that imported this name directly.

`createCollectionPageExports({ config, importMap, slug?, renderPath?, routing }, deps, options?)`:

| Param        | Type            | Description                                                            |
|--------------|-----------------|------------------------------------------------------------------------|
| `config`     | `Promise<SanitizedConfig>` | Resolved Payload config from `payload.config.ts`         |
| `importMap`  | `ImportMap`     | The host's `app/(payload)/admin/importMap.js`                          |
| `slug`       | `string`        | Default `'pages'`                                                      |
| `renderPath` | `string`        | Override the lib's `PAGES_RENDER_PATH`                                 |
| `routing`    | `PageRouting`   | The host's `defineRouting({...})` result — drives URL building, hreflang, and the language switcher |
| `deps.getServerSideURL`     | `() => string` | Host's absolute URL helper                            |
| `deps.generateMeta`        | `(args) => Promise<Metadata>` | Host's metadata composer        |
| `deps.notFoundOnMissing`    | `boolean`     | Default `true` — render 404 for unknown slugs                          |
| `deps.showcase`            | `ShowcaseOptions \| false` | When `{ enabled: true }`, wraps the body in `<PageShowcase>`     |
| `deps.homeExtras`          | `(args) => ReactNode \| Promise<ReactNode>` | Content appended to the home route (slug = `''`) |
| `options.jsonLd`           | `boolean \| JsonLdEntry[]` | Default `{ type: 'website' }` for every page         |
| `options.changefreq`       | `string`      | Default `'weekly'`                                                     |
| `options.priority`         | `number`      | Default `0.5`                                                          |
| `options.websiteName`      | `string`      | Override the auto-generated `WebSite` JSON-LD `name`                   |

`createSitemapFile({ ... })`:

| Option          | Type            | Description                                                            |
|-----------------|-----------------|------------------------------------------------------------------------|
| `collections`   | `string[]`      | Collection slugs whose docs appear in the sitemap                       |
| `config`        | `Promise<any>`  | The Payload config promise                                              |
| `getServerSideURL` | `() => string` | Host's absolute URL helper                                             |
| `localePrefix`  | `'always' \| 'as-needed' \| 'never'` | Default `'always'`. Mirrors next-intl's `localePrefix` so the sitemap URLs match the host's route shape. With `'as-needed'`, the default locale renders without a prefix. |
| `locales`       | `string[]`      | Optional locale filter. Defaults to every `config.localization.locales`. |
| `urlPrefixes`   | `Record<string, string>` | Per-collection URL path prefix. Default `''`. Pass `{ posts: '/posts' }` for a collection mounted under a sub-route. |
| `perCollection` | `Record<string, { priority?, changefreq? }>` | Per-collection overrides                            |

## Migration notes

- `src/middleware.ts` is deprecated in favor of `src/proxy.ts` (next-intl ≥4). The lib doesn't ship a middleware — wire `createMiddleware(routing)` in your own `proxy.ts`.
- `PageRouting` is a new required arg on `createCollectionPageExports`. It's a structural subset of the next-intl `defineRouting` result (locales, defaultLocale, localePrefix, labels), so passing your routing object directly works.
- `createBaseSeed` now sets `_status: 'published'` on created / updated pages and posts by default. Pass `status: 'draft'` per entry to keep it as a draft.

## Building

```bash
bun install
bun run build      # produces dist/ via bunup
bun run typecheck  # tsc --noEmit
bun run test       # vitest run
```

The lib is built with the same `bunup` + `exports` plugin pattern as
the monorepo's other plugins. One shim file per subpath under
`src/exports/`, each re-exports from the implementation.

## License

MIT