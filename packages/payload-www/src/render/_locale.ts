// Locale helpers shared between revalidation hooks and the sitemap
// handler. Internal — not exported from the lib surface. Underscore
// prefix marks it private; hosts should not import from this module.

export type LocalePrefixMode = 'always' | 'as-needed' | 'never'

/**
 * Build the locale prefix segment for a URL. Mirrors next-intl's
 * `localePrefix` semantics:
 *
 * - `'always'` — every URL is prefixed with `/${locale}/...`
 *   (e.g. `/en/about`, `/uk/about`).
 * - `'as-needed'` — the default locale renders without a prefix
 *   (e.g. `/about`), other locales are prefixed (`/uk/about`).
 * - `'never'` — no locale prefix at all (single-locale sites or
 *   hosts that don't expose locales in the URL).
 *
 * Returns an empty string when the host should omit the prefix,
 * otherwise a leading-slash + locale segment (`/en`, `/uk`).
 *
 * Callers append any sub-path (`/${slug}`, `/posts/${slug}`).
 */
export function prefixFor(locale: string, defaultLocale: string, mode: LocalePrefixMode): string {
  let result: string
  if (mode === 'never') result = ''
  else if (mode === 'as-needed' && locale === defaultLocale) result = ''
  else result = `/${locale}`
  console.log('[WWW] render/_locale:prefixFor locale=', locale, 'default=', defaultLocale, 'mode=', mode, '->', JSON.stringify(result))
  return result
}

/**
 * Resolve the request locale with a safe fallback chain:
 *
 * 1. `req.locale` if it's a non-empty string.
 * 2. `req.payload.config.localization.defaultLocale` if set.
 * 3. `''` (caller's last resort).
 *
 * Defensive about runtime shapes — Payload's `req.locale` may be
 * `undefined`, and `config.localization` may be missing entirely
 * for hosts that didn't declare locales. Takes a loose `unknown`
 * shape so callers can pass `PayloadRequest` directly without
 * structural-type gymnastics.
 */
export function resolveLocale(req: unknown): string {
  if (!req || typeof req !== 'object') {
    console.log('[WWW] render/_locale:resolveLocale -> "" (no req)')
    return ''
  }
  const r = req as { locale?: unknown; payload?: unknown }
  if (typeof r.locale === 'string' && r.locale.length > 0) {
    console.log('[WWW] render/_locale:resolveLocale ->', r.locale, '(from req.locale)')
    return r.locale
  }
  const fallback = (r.payload as { config?: { localization?: { defaultLocale?: unknown } } } | undefined)?.config?.localization?.defaultLocale
  if (typeof fallback === 'string' && fallback.length > 0) {
    console.log('[WWW] render/_locale:resolveLocale ->', fallback, '(from config.localization.defaultLocale)')
    return fallback
  }
  console.log('[WWW] render/_locale:resolveLocale -> "" (no locale anywhere)')
  return ''
}

/**
 * List every locale the host has declared on
 * `req.payload.config.localization.locales`. Accepts both the
 * string form (`['en', 'uk']`) and the object form
 * (`[{ code: 'en' }, { code: 'uk' }]`). Returns `[]` if no locales
 * are declared — callers should fall back to `resolveLocale(req)`
 * in that case.
 */
export function allLocales(req: unknown): string[] {
  if (!req || typeof req !== 'object') {
    console.log('[WWW] render/_locale:allLocales -> [] (no req)')
    return []
  }
  const r = req as { payload?: unknown }
  const list = (r.payload as { config?: { localization?: { locales?: unknown } } } | undefined)?.config?.localization?.locales
  if (!Array.isArray(list) || list.length === 0) {
    console.log('[WWW] render/_locale:allLocales -> [] (no locales declared)')
    return []
  }
  const out: string[] = []
  for (const entry of list) {
    if (typeof entry === 'string' && entry.length > 0) {
      out.push(entry)
    } else if (entry && typeof entry === 'object' && 'code' in entry) {
      const code = (entry as { code?: unknown }).code
      if (typeof code === 'string' && code.length > 0) out.push(code)
    }
  }
  console.log('[WWW] render/_locale:allLocales ->', JSON.stringify(out))
  return out
}
