import { SLUG_NESTED_DIVIDER } from '../../../render/metadata/slug'

export const SLUG_LOCK_FIELD = 'slugLock'

export const SLUG_PATTERN = /^[a-z0-9_-]+$/

// a spaced slash, so `Delivery/Receiving` and `24/7` stay inside one segment
const TITLE_PATH_DIVIDER = /\s+\/\s+/

// letters nfkd can't split into a base letter and a mark
const LIGATURES: Record<string, string> = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd' }

function toAscii(value: string) {
  return value
    .toLowerCase()
    .replace(/[ßæœøłđ]/g, (letter) => LIGATURES[letter])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

export function formatSlugSegment(value: string) {
  return toAscii(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// `/` nests like the divider, so `about/team` and `about_team` both address /about/team
export function formatSlug(value: string, nested: boolean) {
  if (!nested) return formatSlugSegment(value)
  return value.split(/[/_]/).map(formatSlugSegment).filter(Boolean).join(SLUG_NESTED_DIVIDER)
}

// keeps edge hyphens and dividers, so it can run on every keystroke
export function typeSlug(value: string, nested: boolean) {
  const ascii = toAscii(value)
  if (!nested) return ascii.replace(/[^a-z0-9]+/g, '-')
  return ascii.replace(/\//g, SLUG_NESTED_DIVIDER).replace(/[^a-z0-9_]+/g, '-').replace(/_+/g, SLUG_NESTED_DIVIDER)
}

export function slugParent(slug: string | null | undefined) {
  return slug?.split(SLUG_NESTED_DIVIDER).slice(0, -1).join(SLUG_NESTED_DIVIDER) ?? ''
}

// a title like `Products / Rental` spells its whole path, any other one only the last segment.
// '' when the title has no letters, rather than the bare parent
export function generateSlug(title: string, parent = '') {
  const path = title.split(TITLE_PATH_DIVIDER).map(formatSlugSegment).filter(Boolean)
  if (path.length > 1) return path.join(SLUG_NESTED_DIVIDER)
  return path[0] ? [parent, path[0]].filter(Boolean).join(SLUG_NESTED_DIVIDER) : ''
}

export function slugFromTitle(title: string, nested: boolean, current?: string | null) {
  return nested ? generateSlug(title, slugParent(current)) : formatSlugSegment(title)
}
