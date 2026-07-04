import 'server-only'

import type { ReactElement } from 'react'
import { RenderedWWWModule } from "../renderWWWModule"

export function HeaderPage({ data }: RenderedWWWModule): ReactElement {
  const nav = (data.nav ?? []) as Array<{
    blockType?: string;
    title?: string;
    link?: Record<string, any>;
    links?: Array<{ link?: Record<string, any> }>
  }>
  const items = nav.filter((b) => b.blockType === 'navItem')
  const columns = nav.filter((b) => b.blockType === 'navColumn')

  const renderLink = (link?: Record<string, any>, fallbackHref: string = '#') => {
    if (!link) return <a href={fallbackHref}>{(link as any)?.label ?? ''}</a>
    if (link.type === 'custom' && typeof link.url === 'string') {
      return <a href={link.url}>{link.label}</a>
    }
    if (link.type === 'reference' && link.reference) {
      const ref = link.reference
      if (typeof ref === 'object' && ref.slug) {
        return <a href={`/${ref.slug}`}>{link.label}</a>
      }
    }
    return <a href={fallbackHref}>{link.label ?? ''}</a>
  }

  return (
    <nav>
      {items.map((item, i) => (
        <span key={`item-${i}`} style={{ marginRight: 16 }}>
          {renderLink(item.link)}
        </span>
      ))}
      {columns.map((col, i) => (
        <div key={`col-${i}`} style={{ display: 'inline-block', marginRight: 24, verticalAlign: 'top' }}>
          {col.title ? <strong>{col.title}</strong> : null}
          <div>
            {(col.links ?? []).map((entry, j) => (
              <div key={`col-${i}-link-${j}`}>{renderLink(entry.link)}</div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
