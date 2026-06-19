# @justanarthur/payload-plugin-seo

SEO plugin for Payload CMS — adds a `meta` group field (title, description,
keywords, image, Open Graph, Twitter Card, advanced) and a `/plugin-seo/generate`
HTTP endpoint for AI-assisted meta generation.

## Install

```bash
pnpm add @justanarthur/payload-plugin-seo
```

## Quick start

```ts
// payload.config.ts
import { seoPlugin } from '@justanarthur/payload-plugin-seo'

export default buildConfig({
  plugins: [
    seoPlugin({
      collections: ['pages', 'posts'],
      uploadsCollection: 'media',
      generateSEO: async ({ doc }) => {
        // call your LLM of choice; return any subset of the SEOMeta shape
        return { title: doc.title, description: doc.excerpt }
      }
    })
  ]
})
```

The plugin adds a `meta` group field to every collection in `collections`.
Editors can click **Generate** in the meta panel to invoke `generateSEO` (or
the OpenAI fallback if `openaiApiKey` is set).

## Auto-generate meta on save

Set `autoGenerate` on the plugin to fill empty meta fields automatically —
no editor click required.

```ts
seoPlugin({
  collections: ['pages'],
  autoGenerate: {
    mode: 'onCreateOrUpdate',           // fires on every save
    onlyFillEmpty: true,                // never overwrite editor-set values
    deriveFrom: 'allScalars'            // heuristic: read every scalar field
  }
})
```

### `mode`

| Value | Behavior |
|---|---|
| `'onCreateOrUpdate'` (default) | Hook fires on every save — create and update. Editor-set meta is preserved because `onlyFillEmpty: true` is the default. |
| `'onCreate'` | Only the first save of a new doc. Subsequent saves never auto-fill. |
| `'onUpdate'` | Only subsequent saves (not the first). Useful for refreshing meta when source content changes. |
| `'off'` | Hook installed but does nothing. Same as omitting the option. |

### `deriveFrom`

Two shapes:

```ts
// (default) — heuristic: extract every scalar from the doc, apply name-based
// mapping rules. Field named `title` → meta.title, `description`/`excerpt`/
// `summary` → meta.description, image-like relation → meta.image, etc.
deriveFrom: 'allScalars'

// Explicit per-slot source field map. Read `data[sourceField]` verbatim
// and copy to the named meta slot. Useful when the collection has many
// text fields and the heuristic would pick wrong.
deriveFrom: {
  title: 'pageTitle',
  description: 'summary',
  image: 'heroImage',
  keywords: 'tags'
}
```

### `onlyFillEmpty`

Default `true`. Only meta fields that are currently empty get filled — the
editor's existing values are preserved across saves. Set to `false` to
overwrite editor-set meta on every save (rarely what you want).

### `timeoutMs`

Default `8000`. Hard cap on the LLM generator pass when `generateSEO` or
`openaiApiKey` is set. On timeout, the heuristic result is kept and the
save proceeds.

### What gets filled automatically

In `'allScalars'` mode the heuristic maps:

- `meta.title` ← a field named `title` (or first non-empty text field)
- `meta.description` ← a field named `description` / `excerpt` / `summary`
  (or first 155 chars of any `richText` body, or first 155 chars of any
  text scalar)
- `meta.image` ← an `upload` / `relationship` field whose name contains
  `image` / `cover` / `hero` (or the first image-like relation in the doc)
- `meta.keywords` ← a field named `keywords`, or top 8 unique tokens from
  the union of all text in the doc (stopword-filtered)

After the heuristic pass, `meta.title` is mirrored to `ogTitle` and
`twitterTitle`, `meta.description` to `ogDescription` and
`twitterDescription`, `meta.image` to `ogImage` and `twitterImage` — but
only into empty secondary slots.

The pass then calls `generateSEO` / OpenAI (if configured) to fill any
remaining empty slots. Generator failures or timeouts never block the save.

## Options reference

| Option | Type | Default | Notes |
|---|---|---|---|
| `collections` | `CollectionSlug[]` | — | Collections to add the `meta` group to. |
| `globals` | `GlobalSlug[]` | — | Globals to add the `meta` group to. |
| `fields` | `(args) => Field[]` | — | Override the default `meta` field. |
| `generateSEO` | `GenerateSEO` | — | User-supplied generation function. |
| `openaiApiKey` | `string` | — | OpenAI key for the built-in fallback. |
| `tabbedUI` | `boolean` | `false` | Group fields into Content / SEO tabs. |
| `uploadsCollection` | `CollectionSlug` | — | Slug for image-relation fields. |
| `interfaceName` | `string` | — | TS interface name for the `meta` group. |
| `autoGenerate` | `AutoGenerateConfig \| false` | `undefined` | Auto-fill empty meta on save. See above. |
