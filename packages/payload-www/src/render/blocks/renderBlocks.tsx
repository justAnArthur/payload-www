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
    const blockCustom = blockConfig?.custom?.[packageName]
    const customPath = blockCustom?.path

    // ponytail: only hand `searchParams` to blocks that ask for it.
    //
    // Next's `searchParams` is a tracking proxy: ANY property read marks the
    // render dynamic. Passing it to every block meant every client-component
    // block got it as a prop, and React's Flight serializer walks props with
    // JSON.stringify — tripping the proxy on pages that never use search
    // params at all. Next 16 then fails the request with "Page changed from
    // static to dynamic at runtime" (stack: Object.get -> stringify). With a
    // client block as common as a hero, that is every page on the site.
    //
    // Blocks opt in with `custom['<pkg>'].searchParams = true`.
    const wantsSearchParams = blockCustom?.searchParams === true

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
        {...(wantsSearchParams ? { searchParams } : null)}
      />
    )
  }

  return <>{rendered}</>
}
