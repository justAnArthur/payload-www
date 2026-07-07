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
| Pages + Posts collections | `createPagesCollection`, `createPostsCollection` (internal — composed by the composer) | Pages (title, blocks tab, slug, drafts, revalidation); Posts (title, excerpt, richText, drafts, revalidation). |
| Header + Footer globals | `createHeaderGlobal`, `createFooterGlobal` (internal) | Both nav blocks with `navColumn` / `navItem`. Extend via `link({ extraFields })`. |
| Static-page collection | `createWWWCollectionGlobal` ([`/collections`](#collections)) | Generic factory for system pages (404, 500, search-empty) — keyed by a discriminator, no slug. |
| Default plugins | composed by `createWWWConfig()` | `seoPlugin`, `imageHashPlugin`, `translator`, `mcpPlugin`. Tune via `defaultPluginsConfigs`. |
| Fields | [`/fields`](#fields) | `link`, `linkGroup` (with `disableLabel` / `appearances` / `localized` / `relationTo` / `extraFields`), `slugField`, `appearanceOptions`. |
| Access | [`/access`](#access) | `anyone`, `authenticated`, `authenticatedOrPublished`. |
| Revalidation hooks | [`/collections`](#collections) (`createRevalidateCollectionGlobalHook`, `createCollectionCacheKey`, `populatePublishedAt`) | Tag-based cache invalidation + published-at population. |
| Metadata | [`/metadata`](#metadata) | `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildWebSiteLd`, `buildProductLd`, `buildRootJsonLd`; slug transforms; `queryDocBySlug`, `queryAllDocs`, `queryAllLocaleSlugs`. |
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
```

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

### `createCollectionPageExports(args, deps)` — deps

| dep | type | notes |
|---|---|---|
| `getServerSideURL` | `() => string` | host's absolute-URL helper |
| `pagePathPrefix` | `string` | optional URL prefix for `generateSitemap` only — not used for rendering |

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

The lib's Pages `afterChange` hook fires `revalidateTag(collection_pages_<slug>_<locale>, 'max')`,
which is the key `createCollectionPageExports` / `createSitemapFromCollections` reads from — so
edits refresh the sitemap without manual rebuilds.

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

The `static-pages` collection is built via `createWWWCollectionGlobal({...}, { slug: 'static-pages', renderPath: '@/components/StaticPage/Component#StaticPage', isDraft: false })`. Editors pick a `kind` (`'not-found'`, `'server-error'`, `'search-empty'`, `'offline'`), populate the `blocks` tab with the same block set you passed to `createWWWConfig`, and the host's not-found / server-error route renders the row. `populatePublishedAt` and the revalidation hooks are wired automatically.

## Collections

```ts
import {
  createWWWCollectionGlobal,         // generic factory (used internally for static-pages)
  createRevalidateCollectionGlobalHook, // the afterChange/afterDelete pair
  createCollectionCacheKey,          // produces the tag string
  queryDoc                          // server-side helper used by renderers
} from '@justanarthur/payload-www/collections'
```

`createWWWCollectionGlobal(fields, { slug, renderPath, isGlobalConfig?, isDraft? })`:

| arg | type | notes |
|---|---|---|
| `fields` | `Field[]` | the collection's field set (the factory adds `slug`, `publishedAt`, access, hooks) |
| `slug` | `string` | collection slug |
| `renderPath` | `string` | import-map path to the render component (`'@/components/Foo/Component#Foo'`) |
| `isGlobalConfig` | `boolean` | `true` for globals, `false` (default) for collections |
| `isDraft` | `boolean` | `true` (default) enables Payload's drafts + autosave; `false` for system pages |

The factory wires `custom[packageName] = { path: renderPath }`, access (`create`/`update`/`delete`
require auth, `read` is `anyone` or `authenticatedOrPublished` depending on `isDraft`), the
`afterChange`/`afterDelete` revalidation hook, and `populatePublishedAt` (`beforeChange`).

### Revalidation

`createRevalidateCollectionGlobalHook()` returns `{ afterChange, afterDelete }` — the same function
used for both. On every save / delete of a published doc it fires:

```
revalidateTag(`<slug><slug>_<locale>`, 'max')   // collections
revalidateTag(`<globalSlug>_<locale>`, 'max')  // globals
```

`createCollectionCacheKey({ collectionSlug, slug, locale })` produces the same key string — use it
in your own `unstable_cache` / `fetch` cache keys if you want them invalidated by the lib's hooks.

> The `// @ts-expect-error` and `// todo sitemap caching and revalidation` markers in
> `createRevalidateCollectionGlobalHook.ts` are intentional, not bugs — the hook covers tag-based
> invalidation; URL revalidation and the unified sitemap tag are still TODO.

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
  queryDocBySlug,
  queryAllDocs,             // for generateStaticParams
  queryAllLocaleSlugs,      // for hreflang alternates
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
import { seoPlugin }       from '@justanarthur/payload-plugin-seo'          // no re-export here, import directly
import { mcpPlugin }       from '@payloadcms/plugin-mcp'                    // no re-export here, import directly
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
| `@justanarthur/payload-www/collections` | `createWWWCollectionGlobal`, `createRevalidateCollectionGlobalHook`, `createCollectionCacheKey`, `queryDoc` |
| `@justanarthur/payload-www/fields` | `link`, `linkGroup`, `appearanceOptions`, `slugField`, `LinkAppearances`, `LinkOptions` |
| `@justanarthur/payload-www/access` | `anyone`, `authenticated`, `authenticatedOrPublished` |
| `@justanarthur/payload-www/metadata` | `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildWebSiteLd`, `buildProductLd`, `buildRootJsonLd`, `queryDocBySlug`, `queryAllDocs`, `queryAllLocaleSlugs`, `paramsSlugToSlug`, `slugToParamsSlug` + types |
| `@justanarthur/payload-www/utils` | `generateImportName`, `getFromImportMap` |
| `@justanarthur/payload-www/imagehash` | `imageHashPlugin`, `BlurhashPluginOptions` (re-export of `@justanarthur/payload-imagehash-plugin`) |
| `@justanarthur/payload-www/translator` | `translator` (re-export of `@justanarthur/payload-plugin-translator`) |
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
- `createRevalidateCollectionHook({ collectionSlug, urlPathPrefix, … })` (CHANGELOG `[Unreleased]`)
  → **not implemented yet**. The current hook is `createRevalidateCollectionGlobalHook()` (no args),
  exported from `/collections`. Per-locale URL fan-out + `revalidatePath` does not happen — only
  `revalidateTag` fires.
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