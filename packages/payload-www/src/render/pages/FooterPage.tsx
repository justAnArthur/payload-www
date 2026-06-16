import 'server-only'

import type { ReactElement } from 'react'

type FooterPageProps = {
  /** The resolved Footer global document. `null` if the host hasn't
   * created a Footer yet. */
  data: Record<string, any> | null
  locale: string
}

/**
 * Default visual for the `footer` global. Renders the footer's
 * `nav` blocks (a flat list of `navItem` and `navColumn` blocks)
 * as a simple `<footer>` element.
 *
 * Hosts can replace this visual by setting a different `custom.path`
 * on their own footer global (via the lib's `createFooterGlobal`
 * factory).
 */
export function FooterPage({ data, locale: _locale }: FooterPageProps): ReactElement {
  if (!data) return <></>
  const nav = (data.nav ?? []) as Array<{ blockType?: string; title?: string; link?: Record<string, any>; links?: Array<{ link?: Record<string, any> }> }>
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
    <footer>
      <div>
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
      </div>
    </footer>
  )
}
