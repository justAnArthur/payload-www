# @justanarthur/payload-www

Reusable Payload CMS website template, extracted from the camasys
`frontend/apps/www/payload-www` site. Wires the same collections,
blocks, fields, access, hooks, metadata (JSON-LD, hreflang), and
Next.js page renderers as a versioned library that any Payload + Next.js
host can drop in.

## What's inside

- **Collections** — `Pages` (with tabs, hero, blocks, SEO slot, drafts), `Header` + `Footer` globals
- **Hooks** — `populatePublishedAt`, `createRevalidatePageHooks`, `createRevalidateGlobalHook`, `createTranslateToOtherLocalesHook`
- **Access** — `anyone`, `authenticated`, `authenticatedOrPublished`
- **Fields** — `link`, `linkGroup` (with `disableLabel` / `appearances` / `localized` / `relationTo` / `overrides` options)
- **Metadata** — `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildHreflangAlternates`, slug transforms, `queryDocBySlug` / `queryAllDocs` / `queryAllLocaleSlugs`
- **Pages** — `createLayoutExports`, `createCollectionPageExports`, `addCollectionsToSitemap` (Next.js render factories)
- **Components** — `LivePreviewListener`, `RenderBlocks`
- **Utils** — `getFromImportMap`, `generateImportName`, `renderCollectionModule`
- **Composer** — `createWWWConfig` factory: pass blocks, SEO fields, i18n, and get back the full API
- **Seed** — `createBaseSeed` (idempotent, locale-aware, validates block slugs)
- **Test** — `createTestPayload` (skeleton — full SQLite integration blocked by payload@3.85 drizzle pushDevSchema prompts)

## Quick start

### Wrap an existing Payload config

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { createWWWConfig } from '@justanarthur/payload-www'
import { MyCtaBlock, MyHeroBlock, MyRichTextBlock } from './blocks'
import { seoFields } from './seo'

const { withWWWConfig } = createWWWConfig({
  i18n: { defaultLocale: 'en', locales: ['en', 'sk', 'de'] },
  blocks: [MyCtaBlock, MyHeroBlock, MyRichTextBlock],
  seoFields,
})

export default buildConfig(
  withWWWConfig({
    collections: [],   // optional extra collections
    globals: [],      // optional extra globals
    // ...rest of your config
  })
)
```

`withWWWConfig` injects `Pages`, `Header`, and `Footer` with your
blocks/fields. Pass per-collection overrides via the `collectionOverrides`
param to `withWWWConfig` if you need to tweak the Pages collection
locally.

### Use the collection factories directly

```ts
import { buildConfig } from 'payload'
import {
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
} from '@justanarthur/payload-www/collections'
import { myBlocks } from './blocks'

export default buildConfig({
  collections: [createPagesCollection(myBlocks)],
  globals: [createHeaderGlobal(), createFooterGlobal({ blocks: [] })],
})
```

### Next.js page exports

```ts
// app/(frontend)/[locale]/[...slug]/page.tsx
import { createCollectionPageExports } from '@justanarthur/payload-www/pages'
import configPromise from '@payload-config'
import { hasLocale, setRequestLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { getServerSideURL } from '@/lib/utils/getURL'
import { generateMeta } from '@/lib/utils/generateMeta'

const { default: Page, generateMetadata, generateStaticParams, generateSitemap } =
  createCollectionPageExports(
    { config: configPromise, importMap },
    { defaultLocale: 'en', locales: ['en', 'sk', 'de'] as const, hasLocale, setRequestLocale, routing, getServerSideURL, generateMeta },
    { nestedSlug: true, homeSlug: '', jsonLd: true },
  )

export default Page
export { generateMetadata, generateStaticParams, generateSitemap }
```

## Public API

Everything is named-exported. The root import gives you the full surface:

```ts
import {
  // factory
  createWWWConfig,
  // collections
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  pageSlugNestedDivider,
  PAGES_SLUG,
  // fields
  link, linkGroup, appearanceOptions,
  // access
  anyone, authenticated, authenticatedOrPublished,
  // hooks
  populatePublishedAt,
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook,
  // metadata
  buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd, buildHreflangAlternates,
  queryDocBySlug, queryAllDocs, queryAllLocaleSlugs,
  segmentsToStoredSlug, segmentsToUrlPath, storedSlugToSegments, getUrlPath, buildCanonicalUrl,
  // pages
  createLayoutExports, createCollectionPageExports, addCollectionsToSitemap,
  // components / utils
  LivePreviewListener, RenderBlocks, getFromImportMap, generateImportName, renderCollectionModule,
  // dev
  createBaseSeed, createTestPayload,
} from '@justanarthur/payload-www'
```

Subpath imports are also supported:
- `@justanarthur/payload-www/collections` — collection factories
- `@justanarthur/payload-www/blocks` — `RenderBlocks` (block rendering)
- `@justanarthur/payload-www/fields` — `link` / `linkGroup` / `appearanceOptions`
- `@justanarthur/payload-www/access` — `anyone` / `authenticated` / `authenticatedOrPublished`
- `@justanarthur/payload-www/hooks` — revalidation + i18n hooks
- `@justanarthur/payload-www/globals` — `Header` / `Footer` factories
- `@justanarthur/payload-www/metadata` — JSON-LD + hreflang + slug utilities
- `@justanarthur/payload-www/pages` — Next.js page factories
- `@justanarthur/payload-www/utils` — import map utilities
- `@justanarthur/payload-www/components` — `LivePreviewListener`
- `@justanarthur/payload-www/seed` — `createBaseSeed`
- `@justanarthur/payload-www/test` — `createTestPayload`
- `@justanarthur/payload-www/with-www-config` — `createWWWConfig` (default export)

## Configuration reference

`createWWWConfig({ ... })`:

| Option | Type | Required | Description |
|---|---|---|---|
| `i18n.defaultLocale` | `string` | yes | Source locale for translation jobs |
| `i18n.locales` | `readonly string[]` | yes | Full locale list (used for hreflang, sitemap, i18n routing) |
| `blocks` | `Block[]` | yes | Blocks the Pages collection accepts |
| `seoFields` | `Field[]` | no | Fields rendered in the SEO tab on Pages |
| `slugField` | `Field[]` | no | Override the default `slugField` (e.g. for nested URL schemes) |
| `footerBlocks` | `Block[]` | no | Blocks the Footer global's `blocks` field accepts |
| `pagesRenderPath` | `string` | no | `custom.path` for the Pages collection render module |
| `headerRenderPath` | `string` | no | `custom.path` for the Header global render module |
| `footerRenderPath` | `string` | no | `custom.path` for the Footer global render module |

## Building

```bash
bun install
bun run build      # produces dist/ via bunup
bun run typecheck  # tsc --noEmit
bun run test       # vitest run
```

The lib is built with the same `bunup` + `exports` plugin pattern as
the monorepo's other plugins (`@justanarthur/payload-plugin-seo`,
`@justanarthur/payload-plugin-translator`). One shim file per subpath
under `src/exports/`, each re-exports from the implementation.

## Test coverage

48 unit tests cover:

- **Fields** — `link` and `linkGroup` shape, options, localization, custom relationTo
- **Access** — `anyone`, `authenticated`, `authenticatedOrPublished`
- **Metadata** — slug transforms, hreflang alternates, JSON-LD builders (article, breadcrumbs, organization)
- **Utils** — `getFromImportMap`, `generateImportName`
- **Collections** — `createPagesCollection` (with/without SEO tab, `renderPath`, `versions`), `createHeaderGlobal` (nav blocks), `createFooterGlobal` (blocks/nav/socials)
- **Pages** — `addCollectionsToSitemap` (combines), `createLayoutExports` (smoke), `generatePreviewPath` (null + URL encoding)
- **Factory surface** — `createWWWConfig` exposes the full API
- **Shim parity** — each compiled subpath returns the same function as the source

The seed/test helpers' full integration is not covered by automated
tests because `payload@3.85`'s drizzle `pushDevSchema` can't initialize
a fresh sqlite non-interactively. They are exercised manually in the
camasys `frontend/apps/www` site.

## Migration from the in-tree `payload-www`

The lib preserves the structure of the original
`camasys/frontend/apps/www/payload-www` directory. Files in the lib map
to the original like this:

| Lib path | Original path |
|---|---|
| `src/withWWWConfig.ts` (via `createWWWConfig`) | `payload-www/withWWWConfig.ts` |
| `src/collections/Pages/index.ts` | `payload-www/collections/Pages/index.ts` |
| `src/collections/globals/Header/config.ts` | `payload-www/collections/globals/Header/config.ts` |
| `src/collections/globals/Footer/config.ts` | `payload-www/collections/globals/Footer/config.ts` |
| `src/utils/{getFromImportMap,generateImportName,renderCollectionModule}.tsx` | `payload-www/utils/...` |
| `src/metadata/...` | `payload-www/metadata/...` |
| `src/pages/{createLayoutExports,createCollectionPageExports}.tsx` | `payload-www/pages/...` |
| `src/components/(payload)/LivePreviewListener.tsx` | `payload-www/components/(payload)/LivePreviewListener.tsx` |
| `src/blocks/renderBlocks.tsx` | `payload-www/blocks/renderBlocks.tsx` |

Differences:

- The lib's collections are *factories* (functions), not constants.
  Hosts call them with their own blocks/fields. The original
  `payload-www` defined `const Pages` etc. directly.
- Host-specific imports (`@/lib/...`, `@/components/...`,
  `@/payload-types`, `@/payload-config`) are now parameters:
  `withWWWConfig({...})` takes i18n/blocks/SEO; the page factories
  take `hasLocale`, `setRequestLocale`, `getServerSideURL`,
  `generateMeta` at call time.
- The Pages collection nests `blocks` under a `tabs` group (it was
  flat in the original demo's Pages collection).
- The Header/Footer globals are re-designed around the lib's default
  `link` and `linkGroup` factories. Hosts with custom link fields pass
  them in.

## License

MIT
