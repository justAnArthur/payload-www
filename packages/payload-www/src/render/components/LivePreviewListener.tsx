'use client'

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

export type LivePreviewListenerProps = {
  serverURL?: string
}

export const LivePreviewListener: FC<LivePreviewListenerProps> = ({ serverURL }) => {
  const router = useRouter()
  const url =
    serverURL ??
    process.env.NEXT_PUBLIC_SERVER_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '')
  console.log('[WWW] render/components:LivePreviewListener serverURL=', url)
  return <PayloadLivePreview refresh={router.refresh} serverURL={url}/>
}
