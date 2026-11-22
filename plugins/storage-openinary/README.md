# @justanarthur/payload-storage-openinary

Payload CMS storage adapter that keeps an upload collection's files on a self-hosted
[Openinary](https://github.com/openinary/openinary) server instead of the local disk. It's built on
`@payloadcms/plugin-cloud-storage`, like `@payloadcms/storage-s3`.

## Install

```bash
pnpm add @justanarthur/payload-storage-openinary @payloadcms/plugin-cloud-storage
```

`@payloadcms/plugin-cloud-storage` must be on the same version as `payload` (3.92 or later).

## Use

```ts
// payload.config.ts
import { openinaryStorage } from '@justanarthur/payload-storage-openinary'

export default buildConfig({
  // ...
  plugins: [
    openinaryStorage({
      collections: { media: true },
      folder: 'my-site', // this site's root folder on a shared server
    }),
  ],
})
```

```bash
# .env
OPENINARY_URL=https://media.example.com/api   # the API base; on a single-domain install the API is under /api
OPENINARY_API_KEY=...                     # an API key from the Openinary dashboard
```

Files land at `<folder>/<collection prefix>/<doc prefix>/<filename>` on the server.

## Options

| option | default | |
|---|---|---|
| `collections` | required | `{ media: true }`, or per collection `{ prefix, disablePayloadAccessControl, generateFileURL }` as in `@payloadcms/plugin-cloud-storage` |
| `url` | `process.env.OPENINARY_URL` | Openinary API base URL. A single-domain install (dashboard at `/`) serves the API under `/api`: check that `<url>/health` answers JSON |
| `apiKey` | `process.env.OPENINARY_API_KEY` | sent as `Authorization: Bearer <key>`; never reaches the browser |
| `folder` | none | root folder for this site, so several sites can share one server |
| `publicUrl` | `url` | base for public file URLs, e.g. a CDN in front of Openinary |
| `useCompositePrefixes` | `false` | same meaning as in `@payloadcms/storage-s3` |
| `alwaysInsertFields` | `false` | keep the `prefix` field in the schema while the plugin is disabled |
| `enabled` | `true` | `false` keeps local disk storage, e.g. for local development without a server |

## How it maps to Openinary

| Payload | Openinary |
|---|---|
| upload | `DELETE /storage/<path>` (if present), then `POST /upload` with `folder`, `files`, `names` |
| delete | `DELETE /storage/<path>` (also clears Openinary's transform cache) |
| `/api/<collection>/file/<name>` (default) | proxies `GET /download/<path>`, the original bytes, served inline with the file's MIME type |
| `disablePayloadAccessControl: true` | the file's `url` is `<publicUrl>/t/<path>`, Openinary's public transform route |

Openinary never overwrites: on a name clash it saves `name (1).ext`. The adapter deletes the old
file first, so a replaced upload keeps its path. If the server still renames it (a concurrent
upload, say), the copy is removed and the upload fails instead of leaving an orphan.

With `disablePayloadAccessControl: true`, image URLs can carry Openinary transforms. Insert them
after `/t/`, e.g. `<publicUrl>/t/w_800,f_webp/<path>`. Add the Openinary host to
`next.config` `images.remotePatterns` when `next/image` loads them.

Client (browser-direct) uploads aren't supported: files go through the Payload server.
