import type { FC } from 'react'
import type { ImportMap, SanitizedConfig } from 'payload'

import { getFromImportMap } from '../utils/getFromImportMap'
import { generateImportName } from '../utils/generateImportName'

export type RenderBlocksProps = {
  blocks: Array<{ blockType: string } & Record<string, unknown>>
  blockProps?: Record<string, unknown>
  importMap: ImportMap
  config: SanitizedConfig
  locale: string
  searchParams?: Record<string, string | string[] | undefined>
}

/**
 * Render a page's `blocks` array to React. Each block's render module
 * is resolved via Payload's generated importMap. The host registers
 * each block in the importMap with a key like `BlockCta#default` (use
 * `generateImportName('block', 'cta')` to build the key).
 *
 * Falls back gracefully: if a block's importMap path is missing or
 * the component is not registered, the block is skipped and a
 * `console.warn` is logged (in dev).
 */
export const RenderBlocks: FC<RenderBlocksProps> = ({
                                                      blocks,
                                                      blockProps,
                                                      config,
                                                      importMap,
                                                      locale,
                                                      searchParams
                                                    }) => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null

  const rendered: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const { blockType } = block

    // The host may have registered the render path under either:
    //   1. the standard `Block<Slug>#default` key (recommended), or
    //   2. a custom path under `config.admin.dependencies[blockType].path`.
    const importMapPath: string | undefined =
      config.admin?.dependencies?.[blockType]?.path ?? generateImportName('block', blockType)

    const Block = getFromImportMap(importMapPath, importMap)
    if (!Block) {
      console.warn(`No block found for type: ${blockType}`)
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
