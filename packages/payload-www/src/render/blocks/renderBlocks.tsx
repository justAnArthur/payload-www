import type { FC } from 'react'
import type { ImportMap, SanitizedConfig } from 'payload'

import { getFromImportMap } from '../getFromImportMap'
import { generateImportName } from '../generateImportName'

export type RenderBlocksProps = {
  blocks: Array<{ blockType: string } & Record<string, unknown>>
  blockProps?: Record<string, unknown>
  importMap: ImportMap
  config: SanitizedConfig
  locale: string
  searchParams?: Record<string, string | string[] | undefined>
}


export const RenderBlocks: FC<RenderBlocksProps> = ({
                                                      blocks,
                                                      blockProps,
                                                      config,
                                                      importMap,
                                                      locale,
                                                      searchParams
                                                    }) => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    console.log('[WWW] render/blocks:RenderBlocks no blocks (locale=', locale, ')')
    return null
  }

  console.log('[WWW] render/blocks:RenderBlocks rendering count=', blocks.length, 'locale=', locale)
  const rendered: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const { blockType } = block


    const importMapPath =
      config.admin?.dependencies?.[blockType]?.path || generateImportName('block', blockType)

    const Block = getFromImportMap(importMapPath, importMap)
    if (!Block) {
      console.warn(`[WWW] render/blocks:RenderBlocks no block for type=${blockType} importMapPath=${importMapPath} (locale=${locale})`)
      continue
    }

    console.log('[WWW] render/blocks:RenderBlocks [', i, '] blockType=', blockType, 'importMapPath=', importMapPath)
    rendered.push(
      <Block
        key={i}
        index={i}
        {...blockProps}
        {...block}
        locale={locale}
        searchParams={searchParams}
      />
    )
  }

  return <>{rendered}</>
}
