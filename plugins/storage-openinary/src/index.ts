import path from 'node:path'
import type { Config, Plugin, UploadCollectionSlug } from 'payload'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter, CollectionOptions } from '@payloadcms/plugin-cloud-storage/types'
import { buildStoragePathData, getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities'

import { createOpenInaryClient, encodePath, type OpenInaryClient } from './client'

export { createOpenInaryClient, encodePath, OpenInaryError } from './client'
export type { OpenInaryClient, OpenInaryClientOptions } from './client'

export type OpenInaryStorageOptions = {
  /** Upload collections to store on Openinary: `{ media: true }` or `{ media: { prefix: 'images' } }`. */
  collections: Partial<Record<UploadCollectionSlug, Omit<CollectionOptions, 'adapter'> | true>>
  /** Openinary API base URL. Default: `process.env.OPENINARY_URL`. */
  url?: string
  /** Openinary API key. Default: `process.env.OPENINARY_API_KEY`. */
  apiKey?: string
  /**
   * Root folder for this site on the Openinary server, so several sites can share one server
   * (`uteg-www` → `uteg-www/<collection prefix>/<file>`). Default: none.
   */
  folder?: string
  /**
   * Base URL for public file URLs (`generateURL`, used with `disablePayloadAccessControl`).
   * Default: `url`. Set it when a CDN sits in front of Openinary.
   */
  publicUrl?: string
  /** Same as `@payloadcms/storage-s3`: the stored `prefix` field holds only the document's segment. */
  useCompositePrefixes?: boolean
  /** Keep the prefix field in the schema while the plugin is disabled, so migrations match. */
  alwaysInsertFields?: boolean
  /** `false` turns the plugin off (local disk storage stays). Default: on. */
  enabled?: boolean
  /** Swap the global `fetch` (tests). */
  fetch?: typeof fetch
}

const join = (...parts: Array<string | undefined>) => path.posix.join(...parts.filter((p): p is string => !!p))

const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg', mov: 'video/quicktime', mp4: 'video/mp4',
  pdf: 'application/pdf', png: 'image/png', svg: 'image/svg+xml', webm: 'video/webm', webp: 'image/webp',
}

export function createOpenInaryAdapter({
  client,
  folder,
  publicUrl,
  useCompositePrefixes = false,
}: {
  client: OpenInaryClient
  folder?: string
  publicUrl: string
  useCompositePrefixes?: boolean
}): Adapter {
  const base = publicUrl.replace(/\/+$/, '')

  return ({ collection, prefix = '' }) => ({
    name: 'openinary',

    generateURL: ({ filename, prefix: docPrefix = '' }) => {
      const { storageFilePath } = buildStoragePathData({ collectionPrefix: prefix, docPrefix, filename, useCompositePrefixes })
      return `${base}/t/${encodePath(join(folder, storageFilePath))}`
    },

    handleUpload: async ({ data, file, storageFilePath }) => {
      await client.upload(join(folder, storageFilePath), file.buffer, file.mimeType)
      return data
    },

    handleDelete: async ({ storageFilePath }) => {
      await client.remove(join(folder, storageFilePath))
    },

    staticHandler: async (req, { doc, headers: incoming, params: { clientUploadContext, filename } }) => {
      try {
        const filePath = await getStorageFilePath({ clientUploadContext, collection, collectionPrefix: prefix, doc, filename, req, useCompositePrefixes })
        const forward = new Headers()
        for (const name of ['range', 'if-none-match', 'if-modified-since']) {
          const value = req.headers.get(name)
          if (value) forward.set(name, value)
        }
        const res = await client.download(join(folder, filePath), forward)
        if (res.status === 404) return new Response(null, { status: 404, statusText: 'Not Found' })
        if (!res.ok && res.status !== 304 && res.status !== 206) {
          req.payload.logger.error({ msg: `Openinary download of ${filePath} failed`, status: res.status })
          return new Response('Internal Server Error', { status: 500 })
        }

        let headers = new Headers(incoming)
        for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified', 'cache-control']) {
          const value = res.headers.get(name)
          if (value) headers.set(name, value)
        }
        // /download answers as an attachment with a generic type for anything but media: serve inline with the real type
        const mimeType = (doc as { mimeType?: string } | undefined)?.mimeType
          ?? CONTENT_TYPES[path.extname(filename).slice(1).toLowerCase()]
          ?? res.headers.get('content-type')
          ?? 'application/octet-stream'
        headers.set('content-type', mimeType)
        if (mimeType === 'image/svg+xml' || mimeType.includes('xml')) {
          headers.set('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
        }
        if (collection.upload && typeof collection.upload === 'object' && typeof collection.upload.modifyResponseHeaders === 'function') {
          headers = collection.upload.modifyResponseHeaders({ headers }) || headers
        }
        return new Response(res.status === 304 ? null : res.body, { headers, status: res.status })
      } catch (err) {
        req.payload.logger.error(err)
        return new Response('Internal Server Error', { status: 500 })
      }
    },
  })
}

/**
 * Stores the given upload collections on a self-hosted Openinary server.
 *
 * ```ts
 * plugins: [openinaryStorage({ collections: { media: true }, folder: 'my-site' })]
 * ```
 */
export const openinaryStorage =
  (options: OpenInaryStorageOptions): Plugin =>
  (incomingConfig: Config): Config => {
    const { collections, alwaysInsertFields, useCompositePrefixes } = options

    if (options.enabled === false) {
      if (!alwaysInsertFields) return incomingConfig
      const withoutAdapter = Object.fromEntries(
        Object.entries(collections).map(([slug, opts]) => [slug, { ...(opts === true ? {} : opts), adapter: null }]),
      )
      return cloudStoragePlugin({ alwaysInsertFields: true, collections: withoutAdapter, enabled: false, useCompositePrefixes })(incomingConfig)
    }

    const url = options.url ?? process.env.OPENINARY_URL
    const apiKey = options.apiKey ?? process.env.OPENINARY_API_KEY
    if (!url || !apiKey) {
      throw new Error('openinaryStorage: set OPENINARY_URL and OPENINARY_API_KEY (or pass url and apiKey), or pass enabled: false')
    }

    const adapter = createOpenInaryAdapter({
      client: createOpenInaryClient({ url, apiKey, fetch: options.fetch }),
      folder: options.folder?.replace(/^\/+|\/+$/g, '') || undefined,
      publicUrl: options.publicUrl ?? url,
      useCompositePrefixes,
    })

    const withAdapter = Object.fromEntries(
      Object.entries(collections).map(([slug, opts]) => [slug, { ...(opts === true ? {} : opts), adapter }]),
    )

    const config: Config = {
      ...incomingConfig,
      collections: (incomingConfig.collections ?? []).map((collection) =>
        withAdapter[collection.slug]
          ? { ...collection, upload: { ...(typeof collection.upload === 'object' ? collection.upload : {}), disableLocalStorage: true } }
          : collection,
      ),
    }

    return cloudStoragePlugin({ alwaysInsertFields, collections: withAdapter, useCompositePrefixes })(config)
  }

export default openinaryStorage
