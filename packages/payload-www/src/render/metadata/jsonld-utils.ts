// Per-page JSON-LD utilities (article image + localized field resolution).
// Kept separate from the site-wide builders (which live in the seo plugin) to
// avoid pulling `server-only` from the seo plugin's render path.

export function getImageUrl(doc: Record<string, any>, siteUrl: string): string | null {
  const img = doc?.meta?.image ?? doc?.heroImage ?? doc?.image
  if (!img) return null
  if (typeof img === 'string') return img
  if (img?.url) return img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`
  return null
}

export function resolveLocalizedField(value: unknown, locale: string): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    if (!value.startsWith('{')) return value
    try {
      const parsed = JSON.parse(value)
      return resolveLocalizedField(parsed, locale)
    } catch {
      return value
    }
  }
  if (typeof value !== 'object') return ''
  const obj = value as Record<string, unknown>
  if (typeof obj[locale] === 'string' && (obj[locale] as string).length > 0) {
    return obj[locale] as string
  }
  return Object.values(obj)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' / ')
}