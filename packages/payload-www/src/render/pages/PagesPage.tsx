import type { ReactElement } from 'react'

import { RenderBlocks } from '../blocks/renderBlocks'
import { RenderedWWWModule } from "../renderWWWModule"

export async function PagesPage({ data, locale, ...props }: RenderedWWWModule): Promise<ReactElement> {
  const blocks = ((data as any).blocks ?? []) as Array<{ blockType: string }>

  return <RenderBlocks blocks={blocks} locale={locale} {...props}/>
}
