import type { ReactElement } from 'react'

import { RenderBlocks } from '../blocks/renderBlocks'
import type { SanitizedConfig } from "payload"

type PagesPageProps = {
  /**
   * The resolved page document. The host's `[slug]/page.tsx` route
   * handler is responsible for fetching the doc (via Payload's
   * `getPayload` or via the lib's `createCollectionPageExports`'s
   * `generateMetadata` helper). This component just renders the
   * visual body.
   */
  doc: Record<string, any> | null
  /**
   * Resolved locale string (already validated upstream by the host's
   * `[locale]` route segment).
   */
  locale: string
  /**
   * Block components keyed by `blockType`. The host passes the same
   * `importMap` it uses everywhere else; the lib's `RenderBlocks`
   * resolves each block against the map.
   */
  importMap: Record<string, unknown>,

  config: SanitizedConfig
}

/**
 * Default visual body for the Pages collection. Renders the doc's
 * `blocks` field via the lib's `RenderBlocks`. Hosts can replace
 * this by setting a different `custom.path` on their own Pages
 * collection (via the lib's `createPagesCollection` factory) and
 * pointing it at their own Server Component.
 */
export async function PagesPage({ doc, ...props }: PagesPageProps): Promise<ReactElement> {
  if (!doc) {
    console.log('[WWW] render/pages:PagesPage no doc')
    return <></>
  }
  const blocks = ((doc as any).blocks ?? []) as Array<{ blockType: string }>
  console.log('[WWW] render/pages:PagesPage blocks=', blocks.length, 'locale=', props.locale)
  return (
    <>
      <RenderBlocks blocks={blocks} {...props}/>
    </>
  )
}
