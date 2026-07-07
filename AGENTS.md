# AGENTS.md — payload-www

You're in a Bun-workspace monorepo that ships a reusable Payload CMS website toolkit (`@justanarthur/payload-www`) plus three companion plugins (SEO, imagehash, translator). There's also a private `demo/` showcase app.

## Where to start

**Integrating a host app?** Read the integration skill first:

- [`.mavis/skills/payload-www/SKILL.md`](.mavis/skills/payload-www/SKILL.md) — the working reference for `createWWWConfig()`, page renderers, sitemap, plugin defaults, and the migration gotchas.

**Editing the lib?** Read its README, then the per-plugin READMEs:

- [packages/payload-www/README.md](packages/payload-www/README.md) — the public API surface, options tables, and what's currently wired into `createWWWConfig`.
- [plugins/seo/README.md](plugins/seo/README.md) — `seoPlugin` + the `meta` field.
- [plugins/imagehash/README.md](plugins/imagehash/README.md) — `imageHashPlugin` + the three algorithms.
- [plugins/translate/README.md](plugins/translate/README.md) — `translator` + the four resolvers (Google / OpenAI / Libre / copy).

**Just browsing?** The top-level [README.md](README.md) has the workspace overview + release flow.

## Hard rules for editing this monorepo

- **Source of truth is `package.json#exports`**, not the README's "Public API" table. If a symbol isn't in `exports`, it's not importable from a host app.
- **Cross-plugin deps are `peerDependencies`, not `dependencies` with `file:` links.** The three sibling plugins (`seo`, `translate`, `imagehash`) are listed in `packages/payload-www/package.json#peerDependencies` with version ranges — not in `dependencies` with `file:` paths. Why: `file:` deps in a published package.json break downstream npm installs (npm tries to resolve `file:../../plugins/X` relative to the user's project root, not the published package's origin). Local monorepo dev still resolves them via Bun's workspace symlinks. When you bump a plugin version, update the matching `peerDependencies` range in `packages/payload-www/package.json` to match.
- **Each plugin builds before `payload-www`** — enforced by `properties.priority` in `package.json`. Don't reorder the build.
- **The CHANGELOG is updated per package.** When you ship a behaviour change, edit `packages/payload-www/CHANGELOG.md` (and the plugin's `CHANGELOG.md` if it has one), not the README's prose.
- **`bunup.config.ts` + `src/exports/*.ts` is the build pattern.** Each subpath in `package.json#exports` has a matching `src/exports/<name>.ts` shim that re-exports from `src/`. When you add a new public subpath, add the shim in the same PR.

## What this repo is NOT

- Not a Next.js-only constraint — Payload itself is framework-agnostic; the renderer in `src/render/pages/` is App Router-specific but the rest of the lib (collections, hooks, fields, metadata, plugins) is not.
- Not a one-host project — the lib is consumed by `camasys` (UTG) and potentially other UTG web apps. Don't add app-specific behaviour to the lib. Extend it via the documented option hooks (`extraFields`, `_options.additionalTraverseRichText`, `defaultPluginsConfigs`).
- Not a published demo — `demo/` is private, never published to npm. It's for local development only.

## Release flow quick reference

```bash
# per-package (run inside the package dir)
bun run build      # bunup + (for payload-www) scripts/strip-createRequire.mjs
bun run typecheck
bun run test

# monorepo
bun install        # at repo root — refreshes file: links
```

Tags follow `<package-name>@<version>` (e.g. `@justanarthur/payload-plugin-seo@1.3.11`). The
`bump-version` workflow reads conventional-commit scopes to decide which package(s) to bump — see
the top-level README's "Commit scopes → packages" table.