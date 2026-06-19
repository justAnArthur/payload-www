import type { CollectionConfig, Field } from 'payload'

/**
 * A scalar value extracted from a doc — the kind of thing that can plausibly
 * seed an SEO meta field (title text, description text, image relation id,
 * date, number). Excludes relationships, arrays of blocks, and groups (those
 * are walked recursively, not surfaced as scalars themselves).
 */
export type ScalarValue =
  | string
  | number
  | { __relation: string }
  | { __date: string }
  | { __lexical: string }

/**
 * Output of the extractor. Consumers (heuristic, tests) read these three
 * buckets and ignore the rest.
 */
export type ExtractedDoc = {
  /**
   * Field-name → scalar. Heuristic mode (`deriveFrom: 'allScalars'`)
   * reads from here and matches on field name. Localized values are
   * flattened to the active locale (or the first non-empty locale).
   */
  scalarsByName: Record<string, ScalarValue>
  /**
   * Concatenated plaintext from every text / localized-text / richText
   * field in the doc, in document order. Used for keyword derivation
   * and as the fallback description when no dedicated description
   * field is present.
   */
  allPlainText: string
  /**
   * The id of the first image-like relationship encountered during the
   * walk (in document order). Used as the fallback `image` slot when
   * no named image field is present.
   */
  firstImageId: string | undefined
}

const SCALAR_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'email',
  'code',
  'number',
  'checkbox',
  'date',
  'select',
  'radio',
  'json',
  'point'
])

const IMAGE_NAME_HINT = /image|cover|hero|thumbnail|thumb|ogImage|og_image/i

const isLocalized = (field: Field): boolean => Boolean((field as { localized?: boolean }).localized)

/**
 * Pick the value out of a localized field. `data[fieldName]` is either a
 * plain value (no localization) or `{ [locale]: value }`. We prefer the
 * active locale, then the first non-empty string, then the first defined
 * value.
 */
const pickLocalized = (raw: unknown, locale: string | undefined): unknown => {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw !== 'object') return raw
  const obj = raw as Record<string, unknown>
  if (locale && obj[locale] !== undefined && obj[locale] !== '') return obj[locale]
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && v.length > 0) return v
    if (typeof v === 'number') return v
    if (v !== null && v !== undefined && typeof v !== 'object') return v
  }
  return undefined
}

/**
 * Flatten Lexical JSON to plaintext. Accepts either the full Payload shape
 * `{ root: { children: [...] } }` or a bare node. Walks
 * `root.children[].children[].text` plus any nested `children` arrays
 * (lists, listitems, quotes, headings, links — they all use the same
 * shape). Blocks whose text is inside a `fields` object (e.g. inline
 * `richTextInCol`) are also walked via `fields.richText`. Best-effort: any
 * unrecognized shape is skipped.
 */
export const lexicalToPlainText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const n = node as {
    type?: string
    text?: string
    children?: unknown[]
    fields?: Record<string, unknown>
    root?: unknown
  }
  // Accept either the full Payload wrapper or a bare root.
  const target = n.root ?? n
  if (!target || typeof target !== 'object') return ''
  const t = target as {
    type?: string
    text?: string
    children?: unknown[]
    fields?: Record<string, unknown>
  }
  let out = ''
  if (typeof t.text === 'string') out += t.text
  if (Array.isArray(t.children)) {
    for (const child of t.children) out += ' ' + lexicalToPlainText(child)
  }
  if (t.fields && typeof t.fields === 'object') {
    for (const v of Object.values(t.fields)) {
      out += ' ' + lexicalToPlainText(v)
    }
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Heuristic: is this relationship field an "image-like" upload? Either the
 * field name hints at it, the relationTo is a single media-style collection,
 * or both. Single-source relations and arrays both qualify — we keep the
 * first encountered id only.
 */
const isImageLikeField = (field: Field): boolean => {
  const name = (field as { name?: string }).name ?? ''
  const relationTo = (field as { relationTo?: string | string[] }).relationTo
  if (typeof relationTo === 'string' && IMAGE_NAME_HINT.test(relationTo)) return true
  if (IMAGE_NAME_HINT.test(name)) return true
  return false
}

const extractRelationId = (raw: unknown): string | undefined => {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'object') {
    const obj = raw as { id?: unknown; value?: unknown; createdAt?: unknown }
    if (typeof obj.id === 'string' || typeof obj.id === 'number') return String(obj.id)
    // Skip relationship-value objects that are populated docs (have createdAt but no id) —
    // those would mean the caller wants the full doc, not a media id.
    if (obj.value !== undefined && (typeof obj.value === 'string' || typeof obj.value === 'number')) {
      return String(obj.value)
    }
  }
  return undefined
}

/**
 * Walk a collection schema and pull every text-like scalar, every image
 * relation id, and every piece of plaintext into a flat record. Pure,
 * deterministic, no Payload runtime needed — runs in a hook with `data`
 * already loaded.
 *
 * `@param doc` — the doc being saved (may be the full entity or just
 *                changed fields; we walk by field name)
 * `@param collectionConfig` — the collection config (its `fields` array
 *                              drives the walk)
 * `@param locale` — active locale for localized fields. Falls back to
 *                   first-non-empty if absent.
 */
export const extractScalars = ({
  doc,
  collectionConfig,
  locale
}: {
  doc: Record<string, unknown>
  collectionConfig: CollectionConfig | undefined
  locale: string | undefined
}): ExtractedDoc => {
  const out: ExtractedDoc = {
    scalarsByName: {},
    allPlainText: '',
    firstImageId: undefined
  }

  if (!collectionConfig || !Array.isArray(collectionConfig.fields)) return out

  const walk = (fields: Field[], source: Record<string, unknown> | undefined): void => {
    if (!source || typeof source !== 'object') return
    for (const field of fields) {
      const f = field as Field & {
        name?: string
        type?: string
        localized?: boolean
        fields?: Field[]
        tabs?: { fields: Field[]; name?: string }[]
        blocks?: Record<string, Field[]>
        items?: Field[]
      }
      const raw = f.name !== undefined ? (source as Record<string, unknown>)[f.name] : undefined
      if (raw === undefined || raw === null) continue

      const value = f.localized ? pickLocalized(raw, locale) : raw
      if (value === undefined || value === null) continue

      switch (f.type as string) {
        case 'text':
        case 'textarea':
        case 'email':
        case 'code':
        case 'select':
        case 'radio': {
          if (typeof value === 'string' && value.length > 0) {
            if (f.name) out.scalarsByName[f.name] = value
            out.allPlainText += ' ' + value
          }
          break
        }
        case 'number': {
          if (typeof value === 'number') {
            if (f.name) out.scalarsByName[f.name] = value
          }
          break
        }
        case 'checkbox': {
          // Booleans are not useful for SEO meta — skip.
          break
        }
        case 'date': {
          if (f.name) {
            const iso = typeof value === 'string' ? value : (value as Date).toISOString?.()
            if (iso) out.scalarsByName[f.name] = { __date: iso }
          }
          break
        }
        case 'json': {
          if (f.name && typeof value === 'object') {
            const txt = JSON.stringify(value)
            if (txt.length > 0) out.allPlainText += ' ' + txt
          }
          break
        }
        case 'richText': {
          if (f.name) {
            const txt = lexicalToPlainText(value)
            if (txt.length > 0) {
              out.scalarsByName[f.name] = { __lexical: txt }
              out.allPlainText += ' ' + txt
            }
          }
          break
        }
        case 'upload':
        case 'relationship': {
          const id = extractRelationId(value)
          if (id !== undefined) {
            if (out.firstImageId === undefined && isImageLikeField(f)) out.firstImageId = id
            if (f.name && isImageLikeField(f)) out.scalarsByName[f.name] = { __relation: id }
          }
          break
        }
        case 'array': {
          if (Array.isArray(value) && value.length > 0 && Array.isArray(f.fields)) {
            // Walk the first item — enough to discover a title/description/image
            // inside the first block (hero, lead, etc.). Full-array traversal
            // is intentionally avoided; SEO meta cares about the lead content.
            walk(f.fields, value[0] as Record<string, unknown>)
          }
          break
        }
        case 'group':
        case 'row': {
          if (typeof value === 'object' && !Array.isArray(value) && Array.isArray(f.fields)) {
            walk(f.fields, value as Record<string, unknown>)
          }
          break
        }
        case 'tabs': {
          if (Array.isArray(f.tabs)) {
            for (const tab of f.tabs) {
              if (Array.isArray(tab.fields)) walk(tab.fields, source)
            }
          }
          break
        }
        case 'blocks': {
          if (Array.isArray(value) && f.blocks && typeof f.blocks === 'object') {
            // Same first-item rule as `array`: walk the lead block.
            const lead = value[0] as Record<string, unknown> | undefined
            if (!lead) break
            const blockType = (lead as { blockType?: string }).blockType
            const blockFields = blockType ? f.blocks[blockType] : undefined
            if (Array.isArray(blockFields)) walk(blockFields, lead)
          }
          break
        }
        case 'collapsible':
        case 'custom': {
          if (typeof value === 'object' && !Array.isArray(value) && Array.isArray(f.fields)) {
            walk(f.fields, value as Record<string, unknown>)
          }
          break
        }
        default:
          break
      }
    }
  }

  walk(collectionConfig.fields, doc)
  out.allPlainText = out.allPlainText.replace(/\s+/g, ' ').trim()
  return out
}
