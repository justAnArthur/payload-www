import type { ComponentType, FC, ReactNode } from 'react'
import type { ImportMap, SanitizedConfig } from 'payload'
import { type AsyncImportMap, getFromImportMap } from '../getFromImportMap'
import { name as packageName } from '../../../package.json'

export type RenderBlocksProps = {
  blocks: Array<{ blockType: string } & Record<string, unknown>>
  blockProps?: Record<string, unknown>
  importMap: ImportMap | AsyncImportMap
  config: SanitizedConfig
  locale: string
  searchParams?: Record<string, string | string[] | undefined>
}

const DEFAULT_BLOCK_PATH_PREFIX = '@/components/blocks'

export const RenderBlocks: FC<RenderBlocksProps> = async (
  { blocks, blockProps, config, importMap, locale, searchParams }
) => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0)
    return null

  const rendered: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const { blockType } = block

    const blockConfig = (config.blocks ?? []).find(b => b.slug === blockType)
    const customPath = blockConfig?.custom?.[packageName]?.path

    const importMapPath = (typeof customPath === 'string' ? customPath : null) ?? `${DEFAULT_BLOCK_PATH_PREFIX}/${blockType}`

    const Block = (await getFromImportMap(importMapPath, importMap)) as ComponentType<any> | undefined
    if (!Block) {
      console.warn(`[WWW] render/blocks:RenderBlocks no block for type=${blockType} importMapPath=${importMapPath} (locale=${locale})`)
      continue
    }

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
