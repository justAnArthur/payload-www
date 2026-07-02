// `next/headers` and `next/navigation` are App-Router-only. Resolved
// lazily inside the handler at request time so a Node entrypoint
// (e.g. `payload.config.ts`) that accidentally re-exports this module
// doesn't pull them into its module graph at load time.

export type CreatePreviewHandlerOptions = {
  /** Resolves the host's site URL (used to construct preview links if
   * the host navigates back to the canonical site). */
  getServerSideURL: () => string
  /**
   * Secret token the host configures in `process.env.PREVIEW_SECRET`.
   * The handler validates `?previewSecret=...` against this value and
   * 401s on mismatch.
   */
  secret: string
  /**
   * Whether to enable draft mode on a valid preview. Hosts that use
   * their own preview mechanism can pass `false`.
   * Default: `true`.
   */
  enableDraftMode?: boolean
}

/**
 * Build a Next.js `GET` route handler for the host's
 * `app/(payload)/next/preview/route.ts`. Validates the preview secret
 * from the query string, enables draft mode if configured, and
 * redirects to the `?path=...` value.
 *
 * Usage:
 *
 *   // app/(payload)/next/preview/route.ts
 *   import { createPreviewHandler } from '@justanarthur/payload-www/render-utils'
 *   import { getServerSideURL } from '@/utilities/getURL'
 *   export const GET = createPreviewHandler({
 *     getServerSideURL,
 *     secret: process.env.PREVIEW_SECRET || ''
 *   })
 */
export function createPreviewHandler(options: CreatePreviewHandlerOptions) {
  const { getServerSideURL: _getServerSideURL, secret, enableDraftMode = true } = options
  return async function GET(req: Request): Promise<Response> {
    const { draftMode } = await import('next/headers')
    const { redirect } = await import('next/navigation')
    const url = new URL(req.url)
    const path = url.searchParams.get('path') ?? '/'
    const previewSecret = url.searchParams.get('previewSecret')
    console.log('[WWW] render/preview:createPreviewHandler:GET path=', path, 'hasSecret=', Boolean(previewSecret), 'enableDraftMode=', enableDraftMode)
    if (!previewSecret || previewSecret !== secret) {
      console.warn('[WWW] render/preview:createPreviewHandler:GET invalid preview secret (401)')
      return new Response('Invalid preview secret', { status: 401 })
    }
    if (enableDraftMode) {
      ;(await draftMode()).enable()
      console.log('[WWW] render/preview:createPreviewHandler:GET draftMode enabled')
    }
    redirect(path)
    return new Response(null, { status: 204 })
  }
}
