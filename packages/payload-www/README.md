# @justanarthur/payload-www

A reusable Payload CMS website template: collections, globals, blocks, fields, access, JSON-LD / hreflang metadata, Next.js page renderers, sitemap, and the default plugin set (SEO + imagehash + translator + MCP).

The lib reads your [next-intl](https://next-intl.dev) routing config so locale validation, URL shape,
hreflang alternates, and the language switcher share a single source of truth with the rest of the
app.

The composition root is `createWWWConfig()` — see [Quick start](#quick-start) below.

## What's inside

| piece | exported from | purpose |
|---|---|---|
| Composer | [`/config`](#quick-start) | `createWWWConfig()` — returns `{ withWWWConfig }`. One call wires Pages + Posts + Header + Footer + the default plugin set. |
| Pages + Posts collections | `createPagesCollection`, `createPostsCollection` (internal — composed by the composer) | Pages (title, blocks tab, slug, drafts); Posts (title, excerpt, richText, drafts). Caching comes from the host's `revalidatePlugin()` registration. |
| Header + Footer globals | `createHeaderGlobal`, `createFooterGlobal` (internal) | Both nav blocks with `navColumn` / `navItem`. Extend via `link({ extraFields })`. |
| Static-page collection | `createWWWCollectionGlobal` ([`/collections`](#collections)) | Generic factory for system pages (404, 500, search-empty) — keyed by a discriminator, no slug. |
| Default plugins | composed by `createWWWConfig()` | `seoPlugin`, `imageHashPlugin`, `translator`, `mcpPlugin`. Tune via `defaultPluginsConfigs`. |
| Fields | [`/fields`](#fields) | `link`, `linkGroup` (with `disableLabel` / `appearances` / `localized` / `relationTo` / `extraFields`), `slugField`, `appearanceOptions`. |
| Access | [`/access`](#access) | `anyone`, `authenticated`, `authenticatedOrPublished`. |
| Caching | [`Caching`](#caching) | Cached query getters wrap `@pro-laico/payload-revalidate` finders; tag-based invalidation via `revalidatePlugin()`; `seedPayloadCache` singleton seed. |
| Metadata | [`/metadata`](#metadata) | `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildWebSiteLd`, `buildProductLd`, `buildRootJsonLd`; slug transforms; `queryDocBySlug`, `queryDocByID`, `queryGlobal`, `queryAllDocs`, `queryAllLocaleSlugs`; `seedPayloadCache`, `tagsFor`. |
| Next.js page renderers | [`/render-pages`](#render-pages) | `createCollectionPageExports`, `createRootLayoutExports`; default render components `PagesPage`, `PostsPage`, `HeaderPage`, `FooterPage`, `RootJsonLd`. |
| Sitemap | [`/sitemap`](#sitemap) | `createSitemapFromCollections` (Next.js file-convention helper). |
| Plugin re-exports | [`/imagehash`](#plugin-re-exports), [`/translator`](#plugin-re-exports) | Drop-in for hosts that don't want to import the sibling packages directly. |

## Quick start

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { createWWWConfig } from '@justanarthur/payload-www/config'
import { blocks } from '@/components/blocks'
import { plugins } from '@/plugins'

const { withWWWConfig } = createWWWConfig()

export default buildConfig(withWWWConfig({
  blocks,                                  // Page block set
  plugins,                                 // host plugins appended after the lib's defaults
  collections: (defaults) => [
    ...defaults,
    Media,
    Users
  ],
  globals: (defaults) => [
    ...defaults.map(g => g.slug === 'header'
      ? { ...g, custom: { [payloadWwwName]: { path: '@/components/Header/Component#Header' } }, fields: headerFields }
      : g.slug === 'footer'
        ? { ...g, custom: { [payloadWwwName]: { path: '@/components/Footer/Component#Footer' } }, fields: footerFields }
        : g),
    createStaticGlobal(),
    createMessagesGlobal()
  ],
  defaultPluginsConfigs: {                 // tune the lib's default plugin set
    seo:        (d) => ({ ...d, collections: ['pages', 'posts'], openaiApiKey: process.env.OPENAI_API_KEY }),
    imageHash:  (d) => ({ ...d, algorithm: 'lqip-modern' }),
    translator: (d) => ({ ...d, autoTranslate: true, collections: ['pages', 'posts'], globals: ['header', 'footer', 'messages'] })
  },
  localization: { /* ... */ },
  db: postgresAdapter({ /* ... */ }),
  // ...rest of Payload config
}))
```

`createWWWConfig()` takes **no arguments**. You tune everything via the `WWWInputConfig` passed to
`withWWWConfig`. The composer reads its own package name from `package.json` and uses it as the
`custom.<packageName>` key — that's how the block / collection / global `custom.path` entries get
threaded into Payload's import map.

The `defaultPluginsConfigs` map lets you keep the defaults (seoPlugin, imageHashPlugin, translator,
mcpPlugin) and tweak their constructor args without re-importing them. Pass `(defaults) => …` to
merge or `…` to replace.

## Page exports (Next.js App Router)

```ts
// app/(frontend)/[locale]/layout.tsx
import { createRootLayoutExports } from '@justanarthur/payload-www/render-pages'
import { importMap } from '@/app/(payload)/admin/importMap'
import { routing } from '@/i18n/routing'
import config from '@payload-config'
import { getServerSideURL } from '@/lib/utils/getURL'

const { default: RootLayout, generateStaticParams } = createRootLayoutExports(
  { config, importMap, routing },
  { getServerSideURL }
)

export default RootLayout
export { generateStaticParams }
```

```ts
// app/(frontend)/[locale]/[[...slug]]/page.tsx — Pages home + catch-all
import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import config from '@payload-config'
import { importMap } from '@/app/(payload)/admin/importMap'
import { routing } from '@/i18n/routing'
import { getServerSideURL } from '@/lib/utils/getURL'

const {
  default: Page,
  generateMetadata,
  generateStaticParams,
  generateSitemap
} = createCollectionPageExports(
  { config, importMap, routing, slugShape: 'catch-all' },
  { getServerSideURL }
)

export default Page
export { generateMetadata, generateStaticParams, generateSitemap }

// the doc lookup blocks so unknown slugs can return a real 404
export const instant = false
```

The page looks up the document before it renders anything, so a missing slug returns HTTP 404
rather than a streamed not-found body with status 200. Slugs from `generateStaticParams`
prerender. Next renders any other slug on its first request, and blocks until the lookup is
done. `export const instant = false` tells Next's dev-time instant validation that the route
blocks on purpose. With `partialPrefetching: true`, Next streams the layout shell for slugs it did
not prerender, so those slugs still get a soft 404.

`slugShape` is `'single'` (default) or `'catch-all'`. Use `'catch-all'` if your route segment is
`[[...slug]]` (Pages-style), `'single'` for `[slug]` (Posts-style — file convention).

```ts
// app/(frontend)/[locale]/posts/[slug]/page.tsx
const { default: PostPage, generateMetadata, generateStaticParams } = createCollectionPageExports(
  { config, importMap, routing, slug: 'posts', slugShape: 'single' },
  { getServerSideURL }
)
```

### `createCollectionPageExports(args, deps)` — args

| arg | type | default | notes |
|---|---|---|---|
| `config` | `Promise<SanitizedConfig>` | required | the host's `payload.config.ts` |
| `importMap` | `ImportMap` | required | the host's `app/(payload)/admin/importMap` |
| `routing` | `RoutingConfig` | required | `{ locales, defaultLocale, localePrefix, labels? }` from `next-intl/routing`'s `defineRouting` |
| `slug` | `string` | `'pages'` | collection slug to query |
| `slugShape` | `'single' \| 'catch-all'` | `'single'` | drives `generateStaticParams` + slug segmentation |
| `depth` | `number` | `2` | relationship / upload hops populated on the rendered document. `0` hands every media and relationship field to the render component as a bare id. Enumeration (`generateStaticParams`, `generateSitemap`) stays at `0` regardless. |

### `createCollectionPageExports(args, deps)` — deps

| dep | type | notes |
|---|---|---|
| `getServerSideURL` | `() => string` | host's absolute-URL helper |
| `pagePathPrefix` | `string \| Record<locale, string>` | URL segment the collection is mounted under, used for `generateSitemap` and for canonical/hreflang URLs. Pass a record to localize the segment (`{ en: 'posts', sk: 'prispevky' }`); locales absent from it fall back to the default locale. The sitemap *index* route always uses the default locale's segment. |
| `fallback` | `ReactNode` | rendered while the found document streams. Defaults to nothing. The lookup itself never streams, so a missing document still returns a 404. |

### What you get back

```ts
{
  default: Page,           // the page component
  generateMetadata,        // Next.js MetadataRoute hook
  generateStaticParams,    // Next.js static-params hook
  generateSitemap          // MetadataRoute.Sitemap producer for /sitemap.ts
}
```

### `createRootLayoutExports(args, deps)`

| arg | type | notes |
|---|---|---|
| `config` | `Promise<SanitizedConfig>` | required |
| `importMap` | `ImportMap` | required |
| `routing` | `RoutingConfig` | required |
| `depth` | `number` | relationship / upload hops populated on the `header` + `footer` globals. Defaults to `2`. |

| dep | type | notes |
|---|---|---|
| `getServerSideURL` | `() => string` | if provided, the SEO plugin's `RootJsonLd` (`Organization` / `WebSite` JSON-LD) is auto-injected as the first child of `<html>` |
| `providers` | `(args) => ReactNode` | wraps `{children}` between the rendered Header and Footer |
| `htmlAttrs` | `(locale) => HTMLAttributes<HTMLHtmlElement>` | extra `<html>` attributes per locale (defaults: `lang={locale}`, `suppressHydrationWarning`) |

The layout reads `header` + `footer` globals in parallel and wraps the children in
`<NextIntlClientProvider>`. Locale is pulled from the `[locale]` route segment and validated against
`routing.locales` — unknown locales trigger `notFound()`.

## Sitemap

```ts
// app/(frontend)/sitemap.ts
import { createSitemapFromCollections } from '@justanarthur/payload-www/sitemap'
import config from '@payload-config'
import { getServerSideURL } from '@/lib/utils/getURL'

export default createSitemapFromCollections({
  getServerSideURL,
  pagePathPrefix: ''                    // empty for root-mounted (Pages)
  // pagePathPrefix: '/posts'           // use this for the Posts catch-all
}, {
  getServerSideURL,
  pagePathPrefix: '/posts'
})
```

`createSitemapFromCollections(...args)` takes one or more deps-shaped objects (the same shape
`createCollectionPageExports`'s deps accept) and returns a Next.js `MetadataRoute.Sitemap`-compatible
function. Mount one per collection under a sub-route, or a single call for the root.

The lib reads through `@pro-laico/payload-revalidate`'s cached finders, so registering
`revalidatePlugin()` in `payload.config.ts` makes every collection / global save revalidate
its tags automatically — no lib-side hooks to wire. Edits refresh the sitemap without
manual rebuilds.

## Static pages (404 / 500 / system)

There's no dedicated `createStaticPageExports` (yet). System pages render via a normal
`createCollectionPageExports({ slug: 'static-pages', slugShape: 'single' })` mount, addressed by a
discriminator instead of a slug:

```ts
// app/(frontend)/[locale]/not-found.tsx
const { default: NotFound } = createCollectionPageExports(
  { config, importMap, routing, slug: 'static-pages', slugShape: 'single' },
  { getServerSideURL }
)

export default NotFound
```

The `static-pages` collection is built via `createWWWCollectionGlobal({...}, { slug: 'static-pages', renderPath: '@/components/StaticPage/Component#StaticPage', isDraft: false })`. Editors pick a `kind` (`'not-found'`, `'server-error'`, `'search-empty'`, `'offline'`), populate the `blocks` tab with the same block set you passed to `createWWWConfig`, and the host's not-found / server-error route renders the row. `populatePublishedAt` is wired automatically; revalidation comes from the host's `revalidatePlugin()` registration.

## Collections

```ts
import {
  createWWWCollectionGlobal,         // generic factory (used internally for static-pages)
  queryDoc                           // server-side helper used by renderers
} from '@justanarthur/payload-www/collections'
```

`createWWWCollectionGlobal(fields, { slug, renderPath, isGlobalConfig?, isDraft? })`:

| arg | type | notes |
|---|---|---|
| `fields` | `Field[]` | the collection's field set (the factory adds `slug`, `publishedAt`, access, the `populatePublishedAt` `beforeChange`) |
| `slug` | `string` | collection slug |
| `renderPath` | `string` | import-map path to the render component (`'@/components/Foo/Component#Foo'`) |
| `isGlobalConfig` | `boolean` | `true` for globals, `false` (default) for collections |
| `isDraft` | `boolean` | `true` (default) enables Payload's drafts + autosave; `false` for system pages |

The factory wires `custom[packageName] = { path: renderPath }`, access (`create`/`update`/`delete`
require auth, `read` is `anyone` or `authenticatedOrPublished` depending on `isDraft`), and
`populatePublishedAt` (`beforeChange`). It does **not** install revalidation hooks — those live
in the host's `revalidatePlugin()` registration (see [Caching](#caching) below).

### Caching

The lib's cached query layer (`queryDocBySlug`, `queryGlobal`, `queryAllDocs`, `queryAllLocaleSlugs`,
`queryDocByID`) wraps `@pro-laico/payload-revalidate`'s finders in `'use cache'` + `cacheLife('weeks')`
scopes. Setup:

1. **Install the peer deps at the workspace root** (not in the lib's `dependencies` — `file:` links
   in a published `package.json` break downstream installs):

   ```bash
   bun add @pro-laico/core @pro-laico/payload-revalidate
   ```

2. **Register `revalidatePlugin()` last in `payload.config.ts#plugins`:**

   ```ts
   import { revalidatePlugin } from '@pro-laico/payload-revalidate'

   export default buildConfig({
     // ...
     plugins: [...otherPlugins, revalidatePlugin()],
   })
   ```

3. **Turn on Next's cacheComponents pipeline** in `next.config.ts`:

   ```ts
   const nextConfig: NextConfig = { cacheComponents: true, /* ... */ }
   ```

4. **Use the lib's getters in renderers** — they're `'use cache'`-wrapped already. No need to
   re-wrap or hand-tag:

   ```ts
   import { queryDocBySlug, queryGlobal } from '@justanarthur/payload-www/metadata'

   const doc = await queryDocBySlug({ collectionSlug: 'pages', slug, locale })
   const header = await queryGlobal({ globalSlug: 'header', locale })
   ```

5. **`seedPayloadCache({ config })`** runs once per process to initialize the pro-laico cache
   helpers from the host's Payload config. `createCollectionPageExports` and
   `createRootLayoutExports` call it automatically — hosts with custom layouts call it directly:

   ```ts
   import { seedPayloadCache } from '@justanarthur/payload-www/metadata'

   seedPayloadCache({ config })
   ```

The cached profile is `cacheLife('weeks')` — Next 16's built-in long-tail profile (5 m stale,
1 w revalidate, 30 d expire). No custom `cacheLife` config entry needed. Invalidations are
purely tag-based: `revalidatePlugin()` fires the same tags the finders emit, so every save /
delete / publish of a Payload doc revalidates the cached render without manual rebuilds.

## Fields

```ts
import { link, linkGroup, appearanceOptions, slugField } from '@justanarthur/payload-www/fields'

// link({ extraFields: [...] })        — append host fields (description, navHover, …)
// linkGroup({ appearances: ['default', 'outline'] })
// slugField({ localized: false, nested: true })
// appearanceOptions                    — for selects that should match link `appearances`
```

`link({ extraFields })` is the extension point for host-specific nav-link shapes. The lib's
`createHeaderGlobal` / `createFooterGlobal` accept `navColumnLinkFields` / `navItemLinkFields` that
are forwarded into their `navColumn` / `navItem` blocks.

## Access

```ts
import { anyone, authenticated, authenticatedOrPublished } from '@justanarthur/payload-www/access'
```

- `anyone` — always true.
- `authenticated` — true when the request has a user.
- `authenticatedOrPublished` — true when authenticated **or** the doc is `_status: 'published'`.

## Metadata

```ts
import {
  buildArticleLd,           // Article JSON-LD
  buildBreadcrumbsLd,       // BreadcrumbList JSON-LD
  buildOrganizationLd,
  buildWebSiteLd,
  buildProductLd,
  buildRootJsonLd,          // combined Organization + WebSite + Product (used by RootJsonLd)
  queryDocBySlug,           // cached collection fetch
  queryDocByID,             // cached collection fetch by id
  queryGlobal,              // cached global fetch
  queryAllDocs,             // for generateStaticParams
  queryAllLocaleSlugs,      // for hreflang alternates
  seedPayloadCache,         // one-time seed for the pro-laico cache helpers
  tagsFor,                  // build cache tags by hand (passthrough of @pro-laico/payload-revalidate)
  paramsSlugToSlug,         // turn [locale]/[[...slug]] params → stored slug
  slugToParamsSlug          // turn stored slug → params for generateStaticParams
} from '@justanarthur/payload-www/metadata'
```

## Blocks

```tsx
import { RenderBlocks } from '@justanarthur/payload-www/blocks'

export function PageBody({ blocks }) {
  return <RenderBlocks blocks={blocks} />
}
```

`RenderBlocks` reads each block's `custom[packageName].path` from Payload and dynamically imports
the matching component from the host's `importMap`.

## Plugin re-exports

```ts
import { imageHashPlugin } from '@justanarthur/payload-www/imagehash'
import { translator }      from '@justanarthur/payload-www/translator'
import { mcpPlugin }       from '@justanarthur/payload-www/mcp'
import { seoPlugin }       from '@justanarthur/payload-plugin-seo'          // no re-export here, import directly
```

Use these if you want to compose the default plugin set manually outside `createWWWConfig`. Full
plugin docs:

- [`@justanarthur/payload-plugin-seo`](../../plugins/seo/README.md)
- [`@justanarthur/payload-imagehash-plugin`](../../plugins/imagehash/README.md)
- [`@justanarthur/payload-plugin-translator`](../../plugins/translate/README.md)

## Public subpath exports

The package's `package.json#exports` map:

| Subpath | What's there |
|---|---|
| `@justanarthur/payload-www/config` | `createWWWConfig`, `WWWConfigApi`, `WWWInputConfig` |
| `@justanarthur/payload-www/render-pages` | `createCollectionPageExports`, `createRootLayoutExports`, `PagesPage`, `PostsPage`, `HeaderPage`, `FooterPage`, `RootJsonLd` + types |
| `@justanarthur/payload-www/pages` | subset of `/render-pages` (no `createRootLayoutExports`, no `PostsPage`, no `RootJsonLd`) |
| `@justanarthur/payload-www/sitemap` | `createSitemapFromCollections` |
| `@justanarthur/payload-www/blocks` | `RenderBlocks`, `RenderBlocksProps` |
| `@justanarthur/payload-www/collections` | `createWWWCollectionGlobal`, `queryDoc` |
| `@justanarthur/payload-www/fields` | `link`, `linkGroup`, `appearanceOptions`, `slugField`, `LinkAppearances`, `LinkOptions` |
| `@justanarthur/payload-www/access` | `anyone`, `authenticated`, `authenticatedOrPublished` |
| `@justanarthur/payload-www/metadata` | `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildWebSiteLd`, `buildProductLd`, `buildRootJsonLd`, `queryDocBySlug`, `queryDocByID`, `queryGlobal`, `queryAllDocs`, `queryAllLocaleSlugs`, `seedPayloadCache`, `tagsFor`, `paramsSlugToSlug`, `slugToParamsSlug` + types |
| `@justanarthur/payload-www/utils` | `generateImportName`, `getFromImportMap` |
| `@justanarthur/payload-www/imagehash` | `imageHashPlugin`, `BlurhashPluginOptions` (re-export of `@justanarthur/payload-imagehash-plugin`) |
| `@justanarthur/payload-www/translator` | `translator` (re-export of `@justanarthur/payload-plugin-translator`) |
| `@justanarthur/payload-www/mcp` | `mcpPlugin`, `MCPPluginConfig` (re-export of `@payloadcms/plugin-mcp`) |
| `@justanarthur/payload-www/import-map-provider` | `setImportMapProvider`, `getImportMap` (stubs in the current build — reserved for future use) |

There is **no root import** (`.`) and **no `/server`, `/with-www-config`, `/globals`, `/hooks`,
`/render-utils`, `/render-components`, `/render-metadata`, `/components`, `/seed`, `/test`,
`/data-seed`, `/data-test`, `/data-collections`** in the published exports — paths the previous
README advertised that will fail at import time.

## What the previous README got wrong

For agents migrating from older docs:

- `createWWWConfig({ locales, blocks })` → now `createWWWConfig()` (no args). Locales come from your
  Payload `localization` config; `blocks` come from the `WWWInputConfig.blocks` field.
- `defaultPlugins` callback → now `defaultPluginsConfigs: { seo, imageHash, translator, mcp }` map
  on `WWWInputConfig`.
- `createRevalidateCollectionHook({ collectionSlug, urlPathPrefix, … })` (older CHANGELOG) and
  `createRevalidateCollectionGlobalHook()` (no args, 1.0.0) → **both removed**. Caching now goes
  through `@pro-laico/payload-revalidate`: install it as a peer dep, register `revalidatePlugin()`
  last in `payload.config.ts#plugins`, and the lib's cached query getters (`queryDocBySlug`,
  `queryGlobal`, `queryAllDocs`, `queryAllLocaleSlugs`, `queryDocByID`) wrap its finders so the
  revalidation tags line up automatically. See [Caching](#caching) above.
- `@justanarthur/payload-www/cache-keys` subpath (older `[Unreleased]`) → **removed**. There is
  no in-tree tag vocabulary to export — tags come from `@pro-laico/payload-revalidate`'s finders.
- `defaultPluginsConfigs.revalidate` slot (older `[Unreleased]`) → **removed**. The in-lib
  revalidation composer is gone; revalidation is the host's responsibility via `revalidatePlugin()`.
- `createSitemapFile` → **not implemented**. The current export is `createSitemapFromCollections`,
  used per-collection from your `app/(frontend)/sitemap.ts`.
- `createPreviewHandler`, `LocaleSwitcher`, `LivePreviewListener`, `PageShowcase`, `HomePage`,
  `createStaticPageExports`, `createStaticPagesCollection` → **none of these exist** as exports in
  the current build. System pages render through a normal `createCollectionPageExports` mount (see
  [Static pages](#static-pages-404--500--system) above).
- `Pages / Posts slug` is `localized: true` by default — slug lives in `<collection>_locales`. Pass
  `slugField({ localized: false })` to opt out per-collection.

## Building

```bash
bun install
bun run build      # bunup + scripts/strip-createRequire.mjs
bun run typecheck  # tsc --noEmit
bun run test       # vitest run
```

The lib uses the same `bunup` + `src/exports/*` shim pattern as the sibling plugins. One shim file
per subpath under `src/exports/`, each re-exporting from the implementation.

## Licence

MIT