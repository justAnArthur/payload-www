import type { CollectionConfig, Field } from 'payload'


export type ScalarValue =
  | string
  | number
  | { __relation: string }
  | { __date: string }
  | { __lexical: string }


export type ExtractedDoc = {
  
  scalarsByName: Record<string, ScalarValue>
  
  allPlainText: string
  
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


export const lexicalToPlainText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const n = node as {
    type?: string
    text?: string
    children?: unknown[]
    fields?: Record<string, unknown>
    root?: unknown
  }
  
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
    
    
    if (obj.value !== undefined && (typeof obj.value === 'string' || typeof obj.value === 'number')) {
      return String(obj.value)
    }
  }
  return undefined
}


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
