# payload-www

A [Payload CMS](https://payloadcms.com) website toolkit — a reusable config builder and a set of
Payload plugins, developed together in a [Bun](https://bun.sh) workspace monorepo.

## Packages

| package | path | description |
|---|---|---|
| [`@justanarthur/payload-www`](packages/payload-www) | `packages/payload-www` | Reusable Payload website template — config builder, collections, globals, blocks, fields, access, hooks, metadata (JSON-LD, hreflang), page renderers, and test helpers. |
| [`@justanarthur/payload-imagehash-plugin`](plugins/imagehash) | `plugins/imagehash` | Automatic Blurhash/Thumbhash encoding of images. |
| [`@justanarthur/payload-plugin-seo`](plugins/seo) | `plugins/seo` | Meta title, description, image and preview fields, with auto-generation hooks. |
| [`@justanarthur/payload-plugin-translator`](plugins/translate) | `plugins/translate` | Automatic localization via Google, OpenAI, LibreTranslate, or custom resolvers. |
| `demo` | `demo` | Private showcase app for `@justanarthur/payload-www` (not published). |

`packages/payload-www` depends on all three plugins via `workspace:*`, so they always build and test
against the local source.

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

CI/CD is powered by [just-github-actions-n-workflows](https://github.com/justAnArthur/just-github-actions-n-workflows).
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
