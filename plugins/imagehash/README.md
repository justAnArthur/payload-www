# @justanarthur/payload-imagehash-plugin

Automatic placeholder-hash encoding for upload collections in [Payload CMS](https://payloadcms.com).
Adds a `<algorithm>Hash` and `<algorithm>DataUrl` text field to each upload collection and populates
them on `beforeChange` so the front-end can paint a low-cost placeholder before the full image lands.

Three algorithms ship in the box — `blurhash`, `thumbhash`, `lqip-modern` — selectable per plugin
instance.

## Install

```bash
pnpm add @justanarthur/payload-imagehash-plugin
```

`sharp@0.x` is a required peer dependency. The plugin also depends on the underlying encoder library
for each algorithm (`blurhash`, `thumbhash`, `lqip-modern`); both are declared as direct deps.

## Quick start

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { imageHashPlugin } from '@justanarthur/payload-imagehash-plugin'

export default buildConfig({
  plugins: [
    imageHashPlugin({
      collections: ['media'],
      algorithm: 'thumbhash'
    })
  ]
})
```

The plugin walks every collection, and for the ones in `collections` (or all upload collections if
`collections` is omitted) it appends two hidden text fields and a `beforeChange` hook that fills them
when a new file lands.

## What gets added to each upload collection

| field              | type   | purpose                                                       |
|--------------------|--------|---------------------------------------------------------------|
| `<algorithm>Hash`  | text   | the encoded placeholder string (blurhash / thumbhash / lqip metadata JSON) |
| `<algorithm>DataUrl` | text | a tiny inline image (`data:image/...`) suitable for `background-image` placeholders |

Both fields default to `admin.hidden: true` — they're not meant for editors. Pass
`showBlurhashField: true` to make them visible (useful during development).

The active algorithm decides the field names: `thumbhash` → `thumbhashHash` + `thumbhashDataUrl`,
`lqip-modern` → `lqip-modernHash` + `lqip-modernDataUrl`, etc.

## Options

| Option              | Type                                                                                                  | Default        | Notes                                                                                  |
|---------------------|-------------------------------------------------------------------------------------------------------|----------------|----------------------------------------------------------------------------------------|
| `algorithm`         | `'blurhash' \| 'thumbhash' \| 'lqip-modern'`                                                          | `'blurhash'`   | Encoder + field-name suffix. Required to be set if you want any non-default algorithm. |
| `collections`       | `CollectionSlug[]`                                                                                    | all uploads    | Upload collection slugs the plugin should extend.                                      |
| `mimeTypePattern`   | `string`                                                                                              | `'image/*'`    | [minimatch](https://github.com/isaacs/minimatch) pattern matched against `data.mimeType`. Non-matches skip the hook. |
| `showBlurhashField` | `boolean`                                                                                             | `false`        | Set `true` to surface the generated hash fields in the admin edit view.                |

Algorithm-specific knobs (forwarded to the encoder):

### `blurhash`

```ts
imageHashPlugin({
  algorithm: 'blurhash',
  width: 32,         // resize box width before encoding
  height: 32,        // resize box height before encoding
  componentX: 3,     // DCT components along X (1-9, higher = more detail)
  componentY: 3      // DCT components along Y
})
```

### `thumbhash`

No additional options. The encoder always resizes to a 100px max edge before hashing.

### `lqip-modern`

```ts
imageHashPlugin({
  algorithm: 'lqip-modern',
  outputFormat: 'webp',   // 'webp' | 'jpeg' | 'jpg' — placeholder format
  outputOptions: { quality: 20 },  // forwarded to sharp
  resize: 16,             // edge length for the placeholder (number or [w, h])
  concurrency: 4          // lib internal; usually leave default
})
```

## Behaviour notes

- The hook runs **only when a real file is being uploaded**. Updates that don't carry a new
  `req.file.data` (e.g. metadata-only edits) are skipped — your manually-edited hashes survive.
- The hook matches `data.mimeType` against `mimeTypePattern` and short-circuits on non-matches, so
  PDFs and videos uploaded alongside images don't trigger the encoder.
- `sharp` runs in-process. On serverless platforms with cold starts, expect the first upload to pay
  the sharp init cost.

## Licence

Unlicense