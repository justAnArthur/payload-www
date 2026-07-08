import Link from 'next/link'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import type { Footer as FooterType } from '@/payload-types'

const isNavItem = (block: NonNullable<FooterType['nav']>[number]): block is Extract<NonNullable<FooterType['nav']>[number], { blockType: 'navItem' }> =>
  block.blockType === 'navItem'

const isNavColumn = (block: NonNullable<FooterType['nav']>[number]): block is Extract<NonNullable<FooterType['nav']>[number], { blockType: 'navColumn' }> =>
  block.blockType === 'navColumn'

export async function Footer({ data }: { data: FooterType }) {
  const nav = (data?.nav ?? []) as NonNullable<FooterType['nav']>
  const itemBlocks = nav.filter(isNavItem)
  const columnBlocks = nav.filter(isNavColumn)

  return (
    <footer className="mt-auto border-t border-border bg-black text-white">
      <div className="container flex flex-col gap-8 py-8 md:flex-row md:justify-between">
        <Link className="flex items-center" href="/">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-4 md:flex-row">
          {itemBlocks.map((item, i) => (
            <CMSLink key={`item-${i}`} {...item.link} appearance="link" />
          ))}
          {columnBlocks.map((col, i) => (
            <div key={`col-${i}`} className="flex flex-col gap-1">
              {col.title ? <span className="text-sm font-semibold">{col.title}</span> : null}
              {(col.links || []).map((entry, j) => (
                <CMSLink key={`col-${i}-link-${j}`} {...entry.link} appearance="link" />
              ))}
            </div>
          ))}
        </nav>
      </div>
    </footer>
  )
}