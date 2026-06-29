# payload-www demo

Minimal showcase for the [`@justanarthur/payload-www`](../packages/payload-www) lib. The demo is the canonical reference for how to wire the lib into a real Next.js + Payload + next-intl app — every feature the lib ships is exposed here, configured end to end.

## What's here

- **Backend** — `src/payload.config.ts` composes the lib with `createWWWConfig({ locales, blocks, defaultPlugins })`. Pages, Posts, Header, Footer, Media, Categories, Users, plus the lib's default plugin set (seo, image-hash, translator).
- **Frontend** — `src/app/(frontend)/[locale]/…` mounts the lib's `createCollectionPageExports` page factory, renders the home inside a `<PageShowcase>` sidebar, and uses `homeExtras` to surface recent pages + posts.
- **i18n** — `src/i18n/routing.ts` is the single source of truth for the demo's URL shape (`as-needed`: `/about` for English, `/uk/about` for Ukrainian). `src/proxy.ts` wires next-intl's middleware.
- **Sitemap** — `app/(frontend)/sitemap.ts` (Next.js's file-convention default export, served at `/sitemap.xml`) uses `createSitemapFile` with `localePrefix: 'as-needed'` and `urlPrefixes: { posts: '/posts' }`. One file covers every collection × locale combination, with full hreflang blocks per URL.
- **Preview** — `app/(payload)/next/preview/route.ts` exposes the lib's `createPreviewHandler`. Wired into the Pages collection's `admin.preview` URL builder.

## Quick start

```bash
# from repo root
bun install
bun run --filter '@justanarthur/payload-www' build   # build the lib once

# from the demo workspace
cd demo
bun install
cp .env.example .env   # or just create .env with PAYLOAD_SECRET + DATABASE_URL
bun run seed           # creates demo user, home, About, Docs, two posts
bun run dev            # http://localhost:3000
```

Sign in at `/admin` with `demo@example.com` / `demopassword123`.

## Smoke test

```bash
curl -s http://localhost:3000/             # home (en)
curl -s http://localhost:3000/uk           # home (uk)
curl -s http://localhost:3000/about        # page (en)
curl -s http://localhost:3000/uk/about     # page (uk)
curl -s http://localhost:3000/sitemap.xml               # unified sitemap (all collections × locales)
```

## Scripts

| Command            | What it does                                                    |
|--------------------|-----------------------------------------------------------------|
| `bun run dev`      | Next.js dev server (Turbopack) with HMR                          |
| `bun run build`    | Production build                                                 |
| `bun run start`    | Run the production build                                         |
| `bun run seed`     | Idempotent seed — creates / updates home, About, Docs, two posts |
| `bun run generate:types`    | Regenerate `payload-types.ts` from the live schema   |
| `bun run generate:importmap`| Regenerate Payload's admin component import map      |
| `bun run lint`     | Biome lint                                                       |
| `bun run check`    | Biome check (lint + format)                                      |

## Notable files

| File                                                | Purpose                                                            |
|-----------------------------------------------------|--------------------------------------------------------------------|
| `src/payload.config.ts`                             | Composes the lib with a few custom tweaks                          |
| `src/i18n/routing.ts`                               | next-intl `defineRouting` — single source of truth for URL shape   |
| `src/proxy.ts`                                      | next-intl middleware (replaces the deprecated `middleware.ts`)     |
| `src/app/(frontend)/[locale]/page.tsx`              | Home page — `<PageShowcase>` sidebar + `homeExtras` recent lists   |
| `src/app/(frontend)/[locale]/[...slug]/page.tsx`    | Catch-all doc page                                                 |
| `src/app/(frontend)/sitemap.ts`                     | Unified sitemap (all collections × locales, hreflang blocks)        |
| `src/app/(payload)/next/preview/route.ts`           | Draft preview handler                                              |
| `src/seed/index.ts`                                 | Idempotent showcase seed (home + About + Docs + two posts)         |