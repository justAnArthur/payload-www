# @justanarthur/payload-plugin-translator

[Payload CMS](https://payloadcms.com) plugin that keeps localized docs in sync. On every save of a
listed collection or global, it schedules background jobs that translate each field from the source
locale into every other declared locale, using a configurable resolver (Google Translate, OpenAI,
LibreTranslate, or your own).

Editor UX: the publish and save buttons in the affected collections/globals are swapped for a
custom variant that surfaces the job status. Locales without translations stay empty until the job
finishes — the plugin never blocks the editor's save.

## Install

```bash
pnpm add @justanarthur/payload-plugin-translator
```

Requires `payload@^3.85.0` and `react@^19`. The plugin reads your `config.localization.locales` —
it short-circuits (returns the config unchanged) when there's only one locale or no localization.

## Quick start

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { translator, openAIResolver } from '@justanarthur/payload-plugin-translator'

export default buildConfig({
  plugins: [
    translator({
      collections: ['pages', 'posts'],
      globals: ['header', 'footer'],
      resolvers: [
        openAIResolver({ apiKey: process.env.OPENAI_API_KEY! })
      ]
    })
  ]
})
```

That's the whole integration. The first save of a Page doc schedules one translate job per non-source
locale; the job runs against your resolver and writes each translated field back into the
collection's `_locales` row.

## Built-in resolvers

| Resolver           | Import                                          | Env / config                    | Notes                                                            |
|--------------------|-------------------------------------------------|---------------------------------|------------------------------------------------------------------|
| `googleResolver`   | `@justanarthur/payload-plugin-translator/resolvers/google` | `apiKey` (Google Cloud Translation API) | Cheap, good for bulk text. Locale codes are remapped where useful (e.g. `ua` → `uk`). |
| `openAIResolver`   | `@justanarthur/payload-plugin-translator/resolvers/openAI` | `apiKey`, optional `model`/`baseUrl`/`prompt`/`chunkLength` | Best fidelity. Default model `gpt-4o-mini`. gpt-5.x uses `max_completion_tokens` + `reasoning_effort: 'low'` automatically. Slugs get a transliteration rule baked into the prompt. |
| `libreResolver`    | `@justanarthur/payload-plugin-translator/resolvers/libreTranslate` | `apiKey`, optional `url`/`chunkLength` | Self-host friendly. Same locale remap as Google.               |
| `copyResolver`     | `@justanarthur/payload-plugin-translator/resolvers/copy`     | none                            | Returns the source text verbatim. Useful as a fallback or for testing. |

You can supply multiple resolvers — they run in the order declared, and the first one to return
`success: true` wins for the chunk.

## Writing your own resolver

```ts
import type { TranslateResolver } from '@justanarthur/payload-plugin-translator/resolvers/types'

export const myResolver: TranslateResolver = {
  key: 'my-translator',
  resolve: async ({ localeFrom, localeTo, texts, req }) => {
    // call your translator of choice
    return { success: true, translatedTexts: ['...'] }
  }
}
```

`texts` is the flat string array extracted from the doc; you return the same-length array in
`translatedTexts`. Returning `{ success: false }` makes the job retry.

## Options reference

| Option        | Type                  | Required | Notes                                                                  |
|---------------|-----------------------|----------|------------------------------------------------------------------------|
| `collections` | `CollectionSlug[]`    | yes      | Collections to auto-translate.                                         |
| `globals`     | `GlobalSlug[]`        | yes      | Globals to auto-translate.                                             |
| `resolvers`   | `TranslateResolver[]` | yes      | Tried in order; first to succeed wins per chunk.                       |
| `autoTranslate` | `boolean`           | no       | Default `true`. Set `false` to opt out of the auto-translate afterChange hook — useful when you drive translation manually via the `translateOperation` export. |
| `disabled`    | `boolean`             | no       | Skip the plugin entirely (no overrides, no jobs). Useful in tests.    |
| `_options.additionalTraverseRichText` | function | no | Hook to extend rich-text traversal — see below.             |

### Rich-text traversal hook

The plugin walks Lexical richText fields itself, but custom Lexical nodes (e.g. blocks the host
defines for landing pages) won't be visited. `_options.additionalTraverseRichText` lets you register
a custom walker:

```ts
translator({
  // ...
  _options: {
    additionalTraverseRichText: ({ root, onText }) => {
      // call onText(siblingData, attribute?) for every leaf string you find
      // siblingData mutates the doc tree in-place
    }
  }
})
```

The hook receives `onText` which mutates the data tree, plus the root node. It's called for every
richText field before translation begins.

## How it works under the hood

- On plugin init: registers a `translate` Payload **task** and a `translate` **workflow**, swapped
  Publish/Save buttons per collection/global, and an admin-only endpoint at `/api/translator/translate`.
- On `afterChange` (when `autoTranslate: true`): the plugin enqueues one workflow run per non-source
  locale. The job extracts translatable fields, asks each resolver in turn, writes the result back
  into the `_locales` row.
- The plugin de-duplicates via `AUTO_TRANSLATE_MARKER` — re-running it on an already-attached hook
  is a no-op, so it's safe to wrap multiple plugins around the same collection.

## Manual translation

Two escape hatches when you don't want the auto-hook:

```ts
// the operation (Payload `operation` you can call from custom endpoints)
import { translateOperation } from '@justanarthur/payload-plugin-translator'

// the job factories (advanced — you usually don't need these directly)
import { createTranslateTask, createTranslateWorkflow } from '@justanarthur/payload-plugin-translator/jobs'
```

For most hosts the auto-hook + resolver list is enough.

## Licence

MIT