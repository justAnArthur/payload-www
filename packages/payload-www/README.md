# @justanarthur/payload-www

Reusable Payload CMS website template. Wires collections, globals,
blocks, fields, access, hooks, metadata (JSON-LD, hreflang), and
Next.js page renderers behind a single `createWWWConfig({ locales, blocks })`
composer. No next-intl glue required — the lib reads the locale list
from the resolved Payload config and generates per-locale URLs itself.

## What's inside

- **Composer** — `createWWWConfig({ locales, blocks, defaultPlugins? })` returns `{ withWWWConfig }`. One composer call is enough for the most common cases.
- **Collections** — `Pages` (title, blocks tab, slug, drafts, revalidation hook)
- **Globals** — `Header` and `Footer` (both `nav` blocks with `navColumn` / `navItem`)
- **Default render components** — `PagesPage`, `HeaderPage`, `FooterPage` Server Components. Override any of them by setting a different `custom.path` on the collection / global.
- **LivePreviewListener** — built in. The lib's `createCollectionPageExports` default page renders it (via `React.lazy` so the server dist stays free of `'use client'` imports) whenever Next.js draft mode is on. Hosts get live preview automatically — no opt-in required. The component itself is also exported from `/render-components` for hosts that want to mount it elsewhere.
- **Hooks** — `createRevalidatePageHooks` (per-locale `revalidatePath` + `revalidateTag('pages-sitemap', 'max')`), `createRevalidateGlobalHook(slug)` (per-locale tag)
- **Access** — `anyone`, `authenticated`, `authenticatedOrPublished`
- **Fields** — `link`, `linkGroup` (with `disableLabel` / `appearances` / `localized` / `relationTo` / `overrides` options)
- **Metadata** — `buildArticleLd`, `buildBreadcrumbsLd`, `buildOrganizationLd`, `buildHreflangAlternates`, slug transforms, `queryDocBySlug` / `queryAllDocs` / `queryAllLocaleSlugs`
- **Pages** — `createCollectionPageExports` (Next.js App Router render factory), `addCollectionsToSitemap`
- **Route handlers** — `createPreviewHandler`, `createSitemapHandler` (from the `/render-utils` subpath)
- **Components** — `LivePreviewListener`, `RenderBlocks`
- **Utils** — `getFromImportMap`, `generateImportName`, `renderCollectionModule`
- **Seed / Test** — `createBaseSeed`, `createTestPayload`

## Quick start

### Wrap an existing Payload config

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

### Next.js page exports

```ts
// app/(frontend)/[slug]/page.tsx
import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
import configPromise from '@payload-config'
import { importMap } from '@/app/(payload)/admin/importMap.js'
import { getServerSideURL } from '@/utilities/getURL'

const { default: Page, generateMetadata, generateStaticParams } =
  createCollectionPageExports(
    { config: configPromise, importMap },
    {
      getServerSideURL,
      generateMeta: async ({ doc }) => ({ title: doc?.title })
    }
  )

export default Page
export { generateMetadata, generateStaticParams }
```

The lib auto-mounts its `LivePreviewListener` (loaded via `React.lazy` so the server dist stays free of `'use client'` imports) whenever Next.js draft mode is on. No opt-in required.

The lib reads `config.localization` and uses the first locale as the
default. No next-intl glue required.

### Preview + sitemap route handlers

```ts
// app/(payload)/next/preview/route.ts
import { createPreviewHandler } from '@justanarthur/payload-www/render-utils'
export const GET = createPreviewHandler()
```

```ts
// app/(frontend)/pages-sitemap.xml/route.ts
import { createSitemapHandler } from '@justanarthur/payload-www/render-utils'
export const GET = createSitemapHandler({ siteUrl: () => process.env.NEXT_PUBLIC_SERVER_URL! })
```

The Pages collection's `afterChange` hook revalidates the
`pages-sitemap` tag the sitemap handler reads from.

## Public API

The root import gives you the full surface:

```ts
import {
  createWWWConfig,           // composer (default export)
  createPagesCollection,     // collection factories
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,       // admin.preview URL builder
  HOME_PAGE_SLUG, PAGES_SLUG,
  link, linkGroup,           // fields
  appearanceOptions,
  anyone, authenticated,     // access
  authenticatedOrPublished,
  createRevalidatePageHooks, // hooks
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
| `@justanarthur/payload-www/render-pages`   | same as `/pages` + `PagesPage` / `HeaderPage` / `FooterPage` |
| `@justanarthur/payload-www/render-utils`   | `createPreviewHandler`, `createSitemapHandler`, `LivePreviewListener` |
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
| `blocks`         | `Block[]`                         | yes      | Blocks the Pages collection accepts.                                   |
| `linkRelationTo` | `string[]`                        | no       | Collection slugs the Header / Footer nav links can reference. Default: `['pages']`. |
| `defaultPlugins` | `(defaults: Plugin[]) => Plugin[]`| no       | Final say on the default `[seoPlugin, imageHashPlugin, translator]` list. |

`createCollectionPageExports({ config, importMap, slug?, renderPath? }, deps, options?)`:

| Param        | Type            | Description                                                            |
|--------------|-----------------|------------------------------------------------------------------------|
| `config`     | `Promise<SanitizedConfig>` | Resolved Payload config from `payload.config.ts`         |
| `importMap`  | `ImportMap`     | The host's `app/(payload)/admin/importMap.js`                          |
| `slug`       | `string`        | Default `'pages'`                                                      |
| `renderPath` | `string`        | Override the lib's `PAGES_RENDER_PATH`                                 |
| `deps.getServerSideURL`     | `() => string` | Host's absolute URL helper                            |
| `deps.generateMeta`        | `(args) => Promise<Metadata>` | Host's metadata composer        |
| `deps.notFoundOnMissing`    | `boolean`     | Default `true` — render 404 for unknown slugs                          |
| `options.jsonLd`           | `boolean \| JsonLdEntry[]` | Default `{ type: 'website' }` for every page         |
| `options.changefreq`       | `string`      | Default `'weekly'`                                                     |
| `options.priority`         | `number`      | Default `0.5`                                                          |
| `options.websiteName`      | `string`      | Override the auto-generated `WebSite` JSON-LD `name`                   |

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
