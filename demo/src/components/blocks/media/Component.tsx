import React from 'react'

import type { MediaBlock as MediaBlockProps, Media as MediaType } from '@/payload-types'

const MediaBlock: React.FC<MediaBlockProps> = ({ media, caption }) => {
  const file = (typeof media === 'object' ? media : null) as MediaType | null
  const src = typeof file?.url === 'string' ? file.url : null

  if (!src) return null

  return (
    <figure className="container my-16">
      <img src={src} alt={file?.alt ?? ''} className="w-full rounded-lg" loading="lazy" />
      {caption ? <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  )
}

export { MediaBlock }
export default MediaBlock