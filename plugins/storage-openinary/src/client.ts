import path from 'node:path'

export type OpenInaryClientOptions = {
  /** Base URL of the Openinary API, e.g. `https://media.example.com` (no trailing slash needed). */
  url: string
  /** An Openinary API key; sent as `Authorization: Bearer <key>`. */
  apiKey: string
  /** Swap the global `fetch` (tests, proxies). */
  fetch?: typeof fetch
}

type UploadResponse = {
  success: boolean
  files?: Array<{ filename: string; path: string; size: number; url: string }>
  errors?: Array<{ filename: string; error: string }>
  error?: string
}

/** Encodes each segment of a storage path, keeping the slashes. */
export const encodePath = (filePath: string) =>
  filePath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')

export class OpenInaryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'OpenInaryError'
  }
}

/** The four Openinary calls a Payload adapter needs. Paths are storage keys like `site/media/a.png`. */
export function createOpenInaryClient({ url, apiKey, fetch: fetchImpl = fetch }: OpenInaryClientOptions) {
  const base = url.replace(/\/+$/, '')
  const auth = { Authorization: `Bearer ${apiKey}` }

  async function remove(filePath: string): Promise<'deleted' | 'missing'> {
    const res = await fetchImpl(`${base}/storage/${encodePath(filePath)}`, { method: 'DELETE', headers: auth })
    if (res.status === 404) return 'missing'
    if (!res.ok) throw new OpenInaryError(`Openinary delete of ${filePath} failed: ${res.status} ${await res.text()}`, res.status)
    return 'deleted'
  }

  /**
   * Stores `buffer` at exactly `filePath`, replacing whatever is there. Openinary never overwrites:
   * it renames a clash to `name (1).ext`, so the old file is deleted first and a renamed result is
   * an error rather than a silently orphaned upload.
   */
  async function upload(filePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    await remove(filePath)

    const key = filePath.replace(/^\/+/, '')
    const folder = path.posix.dirname(key)
    const name = path.posix.basename(key)
    const form = new FormData()
    if (folder !== '.') form.set('folder', folder)
    form.append('files', new Blob([new Uint8Array(buffer)], { type: mimeType }), name)
    form.append('names', name)

    const res = await fetchImpl(`${base}/upload`, { method: 'POST', headers: auth, body: form })
    const body = (await res.json().catch(() => ({}))) as UploadResponse
    if (!res.ok || !body.success) {
      const reason = body.errors?.map((e) => e.error).join('; ') || body.error || res.statusText
      throw new OpenInaryError(`Openinary upload of ${key} failed: ${res.status} ${reason}`, res.status)
    }
    const stored = body.files?.[0]?.path
    if (stored !== key) {
      if (stored) await remove(stored).catch(() => undefined)
      throw new OpenInaryError(`Openinary stored ${key} as ${stored ?? 'nothing'}; rename the file and retry`)
    }
  }

  /** The original bytes, untransformed (`GET /download/*`). Forwards range and conditional headers. */
  function download(filePath: string, headers?: HeadersInit): Promise<Response> {
    return fetchImpl(`${base}/download/${encodePath(filePath)}`, { headers: { ...auth, ...Object.fromEntries(new Headers(headers)) } })
  }

  return { upload, remove, download }
}

export type OpenInaryClient = ReturnType<typeof createOpenInaryClient>
