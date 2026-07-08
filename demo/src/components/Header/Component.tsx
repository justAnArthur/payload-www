import Link from 'next/link'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import type { Header as HeaderType } from '@/payload-types'

const isNavItem = (block: NonNullable<HeaderType['nav']>[number]): block is Extract<NonNullable<HeaderType['nav']>[number], { blockType: 'navItem' }> =>
  block.blockType === 'navItem'

const isNavColumn = (block: NonNullable<HeaderType['nav']>[number]): block is Extract<NonNullable<HeaderType['nav']>[number], { blockType: 'navColumn' }> =>
  block.blockType === 'navColumn'

export async function Header({ data }: { data: HeaderType }) {
  const nav = (data?.nav ?? []) as NonNullable<HeaderType['nav']>
  const itemBlocks = nav.filter(isNavItem)
  const columnBlocks = nav.filter(isNavColumn)

  return (
    <header className="container relative z-20 py-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link className="flex items-center" href="/">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-4 md:flex-row md:items-center">
          {itemBlocks.map((item, i) => (
            <CMSLink key={`item-${i}`} {...item.link} appearance="inline" />
          ))}
          {columnBlocks.map((col, i) => (
            <div key={`col-${i}`} className="flex flex-col gap-1 md:items-center">
              {col.title ? <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</span> : null}
              {(col.links || []).map((entry, j) => (
                <CMSLink key={`col-${i}-link-${j}`} {...entry.link} appearance="inline" />
              ))}
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}