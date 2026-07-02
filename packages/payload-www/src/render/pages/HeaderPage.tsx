import 'server-only'

import type { ReactElement } from 'react'

type HeaderPageProps = {
  /** The resolved Header global document. `null` if the host hasn't
   * created a Header yet. */
  data: Record<string, any> | null
  /**
   * Resolved locale string. The default header visual uses this for
   * per-locale labels via next-intl (if the host has it wired). The
   * default ships without a label dictionary — the host can override
   * by setting a different `custom.path` on the header global.
   */
  locale: string
}

/**
 * Default visual for the `header` global. Renders the header's
 * `nav` blocks (a flat list of `navItem` and `navColumn` blocks) as
 * a simple `<nav>` element.
 *
 * Hosts can replace this visual by setting a different `custom.path`
 * on their own header global (via the lib's `createHeaderGlobal`
 * factory).
 */
export function HeaderPage({ data, locale: _locale }: HeaderPageProps): ReactElement {
  if (!data) {
    console.log('[WWW] render/pages:HeaderPage no data')
    return <></>
  }
  const nav = (data.nav ?? []) as Array<{ blockType?: string; title?: string; link?: Record<string, any>; links?: Array<{ link?: Record<string, any> }> }>
  const items = nav.filter((b) => b.blockType === 'navItem')
  const columns = nav.filter((b) => b.blockType === 'navColumn')
  console.log('[WWW] render/pages:HeaderPage items=', items.length, 'columns=', columns.length, 'locale=', _locale)

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
