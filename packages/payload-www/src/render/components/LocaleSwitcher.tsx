import type { ReactElement } from 'react'

import type { HreflangAlternates } from '../metadata/hreflang'

export type LocaleSwitcherProps = {
  /**
   * The currently-active locale (the one being rendered). The
   * switcher marks the corresponding link with `aria-current="true"`.
   */
  currentLocale: string
  /**
   * The hreflang alternates map as returned by the lib's metadata
   * pipeline. Keys are locale codes; values are absolute URLs. An
   * `'x-default'` entry is also expected.
   */
  hreflangAlternates: HreflangAlternates
  /**
   * Optional human-readable labels per locale. When missing, the
   * switcher falls back to uppercased locale codes.
   */
  labels?: Record<string, string>
}

/**
 * Render a list of links to the same page in every other locale.
 * The component is server-renderable (no `'use client'`) and emits
 * a single `<nav>` element with one `<a>` per locale plus an
 * `x-default` fallback. The lib's `<PageShowcase>` mounts it as a
 * child of the sidebar; hosts can also drop it elsewhere on the
 * page.
 */
export function LocaleSwitcher({
  currentLocale,
  hreflangAlternates,
  labels
}: LocaleSwitcherProps): ReactElement {
  const locales = Object.keys(hreflangAlternates).filter((k) => k !== 'x-default')
  console.log('[WWW] render/components:LocaleSwitcher currentLocale=', currentLocale, 'locales=', JSON.stringify(locales), 'hasXDefault=', Boolean(hreflangAlternates['x-default']))
  return (
    <nav aria-label="Language" className="locale-switcher">
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {locales.map((locale) => {
          const href = hreflangAlternates[locale]
          if (!href) return null
          const isCurrent = locale === currentLocale
          return (
            <li key={locale}>
              <a
                href={href}
                aria-current={isCurrent ? 'true' : undefined}
                hrefLang={locale}
                className="locale-switcher__link"
                data-locale={locale}
              >
                {labels?.[locale] ?? locale.toUpperCase()}
              </a>
            </li>
          )
        })}
        {hreflangAlternates['x-default'] ? (
          <li key="x-default">
            <a
              href={hreflangAlternates['x-default']}
              hrefLang="x-default"
              className="locale-switcher__link"
              data-locale="x-default"
            >
              {labels?.['x-default'] ?? 'Default'}
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
