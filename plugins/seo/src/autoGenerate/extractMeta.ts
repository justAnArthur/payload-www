import type { CollectionConfig, Field } from 'payload'

import type { DeriveFrom, SEOMeta } from '../types'
import { extractScalars, lexicalToPlainText, type ExtractedDoc } from './extractScalars'


export type ExtractMetaArgs = {

  data: Record<string, unknown>

  collectionConfig: CollectionConfig | undefined

  locale: string | undefined

  deriveFrom?: DeriveFrom
}


const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0


const deriveKeywords = (text: string, limit = 8): string => {
  if (text.length === 0) return ''
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'this', 'that', 'these',
    'those', 'it', 'its', 'we', 'you', 'they', 'i', 'he', 'she', 'our', 'your', 'their',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could',
    'may', 'might', 'shall', 'not', 'no', 'if', 'so', 'than', 'then', 'also', 'just', 'about'
  ])
  const counts = new Map<string, number>()
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 4 || stop.has(raw)) continue
    counts.set(raw, (counts.get(raw) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w).join(', ')
}


const matchTitle = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value !== 'string') continue
    if (/\btitle\b/i.test(name) && value.length > 0) return value
  }
  for (const value of Object.values(extracted.scalarsByName)) {
    if (isNonEmptyString(value)) return value
  }
  return undefined
}


const matchDescription = (extracted: ExtractedDoc, maxLen = 155): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value !== 'string') continue
    if (/\b(description|excerpt|summary|lead|intro)\b/i.test(name) && value.length > 0) {
      return value.length > maxLen ? `${value.slice(0, maxLen - 1).trimEnd()}…` : value
    }
  }
  for (const value of Object.values(extracted.scalarsByName)) {
    if (typeof value === 'object' && value !== null && '__lexical' in value) {
      const text = (value as { __lexical: string }).__lexical
      if (text.length > 0) {
        return text.length > maxLen ? `${text.slice(0, maxLen - 1).trimEnd()}…` : text
      }
    }
  }
  if (extracted.allPlainText.length > 0) {
    return extracted.allPlainText.length > maxLen
      ? `${extracted.allPlainText.slice(0, maxLen - 1).trimEnd()}…`
      : extracted.allPlainText
  }
  return undefined
}


const matchImage = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value === 'object' && value !== null && '__relation' in value) {
      return (value as { __relation: string }).__relation
    }
  }
  return extracted.firstImageId
}


const matchKeywords = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value === 'string' && /keyword/i.test(name) && value.length > 0) return value
  }
  return deriveKeywords(extracted.allPlainText) || undefined
}


const runHeuristic = (extracted: ExtractedDoc): Partial<SEOMeta> => {
  const out: Partial<SEOMeta> = {}

  const title = matchTitle(extracted)
  if (isNonEmptyString(title)) out.title = title

  const description = matchDescription(extracted)
  if (isNonEmptyString(description)) out.description = description

  const image = matchImage(extracted)
  if (image) out.image = image

  const keywords = matchKeywords(extracted)
  if (isNonEmptyString(keywords)) out.keywords = keywords

  return out
}


const runExplicitDeriveFrom = ({
  data,
  deriveFrom,
  collectionConfig,
  locale
}: {
  data: Record<string, unknown>
  deriveFrom: Record<string, string>
  collectionConfig: CollectionConfig | undefined
  locale: string | undefined
}): Partial<SEOMeta> => {
  const out: Partial<SEOMeta> = {}

  const isLocalized = (name: string): boolean => {
    if (!collectionConfig) return false
    const find = (fs: Field[] | undefined): boolean => {
      if (!fs) return false
      for (const f of fs) {
        const fn = f as Field & { name?: string; fields?: Field[]; localized?: boolean; tabs?: { fields: Field[] }[] }
        if (fn.name === name) return Boolean(fn.localized)
        if (fn.fields && find(fn.fields)) return true
        if (fn.tabs) for (const t of fn.tabs) if (find(t.fields)) return true
      }
      return false
    }
    return find(collectionConfig.fields)
  }

  const read = (name: string): unknown => {
    const raw = (data as Record<string, unknown>)[name]
    if (raw === undefined || raw === null) return undefined
    if (!isLocalized(name)) return raw
    if (typeof raw !== 'object' || Array.isArray(raw)) return raw
    const obj = raw as Record<string, unknown>
    if (locale && obj[locale] !== undefined && obj[locale] !== '') return obj[locale]
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v.length > 0) return v
      if (typeof v === 'number') return v
    }
    return undefined
  }

  for (const [slot, source] of Object.entries(deriveFrom)) {
    if (!source || typeof source !== 'string') continue
    const value = read(source)
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.length === 0) continue

    if (typeof value === 'object' && value !== null && 'root' in value) {
      const txt = lexicalToPlainText(value)
      if (txt.length > 0) (out as Record<string, unknown>)[slot] = txt
      continue
    }

    ;(out as Record<string, unknown>)[slot] = value
  }

  return out
}


export const extractMetaFromScalars = ({
  data,
  collectionConfig,
  locale,
  deriveFrom
}: ExtractMetaArgs): Partial<SEOMeta> => {
  if (deriveFrom && typeof deriveFrom === 'object' && !Array.isArray(deriveFrom)) {
    return runExplicitDeriveFrom({ data, deriveFrom, collectionConfig, locale })
  }
  const extracted = extractScalars({ doc: data, collectionConfig, locale })
  return runHeuristic(extracted)
}