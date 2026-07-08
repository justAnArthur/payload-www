import React from 'react'

import type { Page } from '@/payload-types'

import ContentBlock from '@/components/blocks/content/Component'
import MediaBlock from '@/components/blocks/media/Component'
import CtaBlock from '@/components/blocks/cta/Component'

type Block = Page['blocks'][number]

const blocksMap: Record<Block['blockType'], React.ComponentType<any>> = {
  content: ContentBlock,
  media: MediaBlock,
  cta: CtaBlock
}

export const RenderBlocks: React.FC<{ blocks: Block[] | null | undefined }> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null

  return (
    <>
      {blocks.map((block, i) => {
        const Component = blocksMap[block.blockType]
        if (!Component) {
          console.warn(`No block found for type: ${block.blockType}`)
          return null
        }
        return <Component key={i} {...(block as any)} />
      })}
    </>
  )
}