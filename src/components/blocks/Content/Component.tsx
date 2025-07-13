import { cn } from '@/lib/utils/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { richText } = props

  return (
    <div className={cn('mx-auto my-8 w-full')}>
      <RichText data={richText} enableGutter={false} enableProse={false} />
    </div>
  )
}
