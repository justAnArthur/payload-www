# payload-www

A [Payload CMS](https://payloadcms.com) website toolkit — a reusable config builder and a set of
Payload plugins, developed together in a [Bun](https://bun.sh) workspace monorepo.

## Packages

| package | path | README | description |
|---|---|---|---|
| `@justanarthur/payload-www` | `packages/payload-www` | [README](packages/payload-www/README.md) | Reusable Payload website template — config builder, collections, globals, blocks, fields, access, hooks, metadata (JSON-LD, hreflang), page renderers, and test helpers. |
| `@justanarthur/payload-imagehash-plugin` | `plugins/imagehash` | [README](plugins/imagehash/README.md) | Automatic Blurhash / Thumbhash / LQIP encoding of uploaded images. |
| `@justanarthur/payload-plugin-seo` | `plugins/seo` | [README](plugins/seo/README.md) | Meta title, description, image and preview fields, with auto-generation hooks and a built-in OpenAI fallback. |
| `@justanarthur/payload-plugin-translator` | `plugins/translate` | [README](plugins/translate/README.md) | Automatic localization via Google, OpenAI, LibreTranslate, or custom resolvers. |
| `demo` | `demo` | [README](demo/README.md) | Private showcase app for `@justanarthur/payload-www` (not published). |

`packages/payload-www` depends on all three plugins via `file:` links, so they always build and
test against the local source.

## Integrating into a host app

The package composes a complete Payload config for you. The minimum integration in a host's
`payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { createWWWConfig } from '@justanarthur/payload-www/config'
import { blocks } from '@/components/blocks'

const { withWWWConfig } = createWWWConfig()

export default buildConfig(withWWWConfig({
  blocks,
  collections: (defaults) => [...defaults, Media, Users],
  globals: (defaults) => defaults,
  defaultPluginsConfigs: {
    seo:       (d) => ({ ...d, collections: ['pages', 'posts'], openaiApiKey: process.env.OPENAI_API_KEY }),
    imageHash: (d) => ({ ...d, algorithm: 'lqip-modern' }),
    translator: (d) => ({ ...d, autoTranslate: true, collections: ['pages', 'posts'], globals: ['header', 'footer'] })
  },
  // ...rest of your Payload config
}))
```

Then mount the lib's Next.js page renderers in `app/(frontend)/[locale]/`:

```ts
// app/(frontend)/[locale]/layout.tsx
import { createRootLayoutExports } from '@justanarthur/payload-www/render-pages'
const { default: RootLayout, generateStaticParams } = createRootLayoutExports(
  { config: import('@payload-config').then(m => m.default), importMap, routing },
  { getServerSideURL }
)
export default RootLayout
export { generateStaticParams }

// app/(frontend)/[locale]/[[...slug]]/page.tsx — Pages home + catch-all
import { createCollectionPageExports } from '@justanarthur/payload-www/render-pages'
const { default: Page, generateMetadata, generateStaticParams, generateSitemap } =
  createCollectionPageExports(
    { config, importMap, routing, slugShape: 'catch-all' },
    { getServerSideURL }
  )
export default Page
export { generateMetadata, generateStaticParams, generateSitemap }
```

The canonical, fully-wired integration lives in the host repo's `apps/www/payload.config.ts` — use
that as the working reference. See
[`packages/payload-www/README.md`](packages/payload-www/README.md) for the full API surface,
plugin knobs, and migration notes from older versions.

## Development

```bash
bun install            # install all workspace dependencies

# per package (run from the package directory)
bun run build          # build with bunup
bun run test           # vitest
bun run typecheck      # tsc --noEmit (where available)
```

The demo app:

```bash
cd demo
bun run dev            # next dev
bun run seed           # seed the local sqlite database
```

## Release automation

CI/CD is powered by
[just-github-actions-n-workflows](https://github.com/justAnArthur/just-github-actions-n-workflows).
Two workflows live in [`.github/workflows/`](.github/workflows):

- **`bump-version`** — on push to `main`, reads conventional-commit scopes, bumps the matching
  package versions, and creates annotated git tags (e.g. `@justanarthur/payload-plugin-seo@1.3.11`)
  carrying their deploy targets.
- **`publish-npm-on-tag`** — on a version-tag push, builds the tagged package and publishes it to
  npm with a GitHub release.

Project settings live in [`.justactions.yml`](.justactions.yml); installed workflow versions are
tracked in [`.github/workflows/.toolkit-lock.json`](.github/workflows/.toolkit-lock.json).

### Commit scopes → packages

A commit's scope decides which package is bumped. The mapping is declared per package under
`properties.gitCommitScopeRelatedNames`:

| package | commit scopes |
|---|---|
| `@justanarthur/payload-www` | `payload-www`, `render`, `revalidation`, `www` |
| `@justanarthur/payload-imagehash-plugin` | `imagehash`, `imghash`, `blurhash`, `thumbhash` |
| `@justanarthur/payload-plugin-seo` | `seo` |
| `@justanarthur/payload-plugin-translator` | `translate`, `translator`, `translation` |

For example, `feat(seo): ...` bumps `@justanarthur/payload-plugin-seo`. Plugins build before
`payload-www` via their lower `properties.priority`.

### Deploy targets

Targets are auto-detected per package: a package is published to **npm** when `private` is not
`true`. The `demo` app is `private: true`, so it is never published.

### Required secrets

Set these in **Settings → Secrets and variables → Actions**:

| secret | used for |
|---|---|
| `GH_TOKEN` | pushing tags and creating GitHub releases (needs `contents:write`) |
| `NPM_TOKEN` | publishing to the npm registry |