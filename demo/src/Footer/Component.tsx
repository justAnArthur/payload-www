import { getCachedGlobal } from '@justanarthur/payload-www/server'
import Link from 'next/link'
import React from 'react'

import configPromise from '@payload-config'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import type { Footer as FooterType } from '@/payload-types'

const isNavItem = (block: NonNullable<FooterType['nav']>[number]): block is Extract<NonNullable<FooterType['nav']>[number], { blockType: 'navItem' }> =>
  block.blockType === 'navItem'

const isNavColumn = (block: NonNullable<FooterType['nav']>[number]): block is Extract<NonNullable<FooterType['nav']>[number], { blockType: 'navColumn' }> =>
  block.blockType === 'navColumn'

/**
 * Host's footer visual. Registered in `payload.config.ts`'s
 * `admin.dependencies` under the importMap key
 * `@/Footer/Component#default` so `createRootLayoutExports`'s
 * `renderGlobalModule` resolves it via the footer global's
 * `custom.path` (overridden in `globals({ defaultGlobals })`).
 */
export default async function Footer() {
  const footerData = await getCachedGlobal(configPromise, 'footer', 1)()
  const nav = (footerData?.nav ?? []) as NonNullable<FooterType['nav']>
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
