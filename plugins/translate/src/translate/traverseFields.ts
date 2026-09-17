import ObjectID from 'bson-objectid'
import type { Field } from 'payload'
import { tabHasName } from 'payload/shared'

import { hasText } from '../utils/hasText'
import { isEmpty } from '../utils/isEmpty'
import { isOpaqueText } from '../utils/isOpaqueText'
import { looksUntranslated } from '../utils/looksUntranslated'
import { sanitizeSlug } from '../utils/sanitizeSlug'
import { traverseRichText } from './traverseRichText'
import type { TranslatableField, ValueToTranslate } from './types'

/** Append a named segment to a field path, handling the empty root. */
const joinPath = (base: string | undefined, segment: string) =>
  base ? `${base}.${segment}` : segment

type Row = Record<string, unknown> & { id?: string; blockType?: string; blockName?: string }

type TraverseArgs = {
  dataFrom: Record<string, unknown>
  emptyOnly?: boolean
  /** with `emptyOnly`, also replace targets that still hold the source copy */
  retranslateIdentical?: boolean
  /** with `retranslateIdentical`, also replace targets written in another language */
  isWrongLanguage?: (target: unknown) => boolean
  fields: Field[]
  localizedParent?: boolean
  path?: string
  siblingDataFrom?: Record<string, unknown>
  siblingDataTranslated?: Record<string, unknown>
  translatedData: Record<string, unknown>
  valuesToTranslate: ValueToTranslate[]
  /** called for every translatable field, whether or not it gets queued; used by the review view */
  onField?: (field: TranslatableField) => void

  _options?: {
    additionalTraverseRichText?: Parameters<typeof traverseRichText>[0]['additionalTraverseRichText']
  }
}

/**
 * rows for a localized array/blocks field in the target locale. existing rows are reused by
 * index (same block type) so ids, `blockName` and untranslatable values survive a re-run.
 */
const buildLocalizedRows = (from: Row[], existing: Row[], isBlocks: boolean, emptyOnly?: boolean): Row[] => {
  const sameShape =
    existing.length === from.length &&
    (!isBlocks || existing.every((row, index) => row.blockType === from[index].blockType))

  if (emptyOnly && sameShape) return existing

  return from.map((row, index) => {
    const previous = existing[index] && (!isBlocks || existing[index].blockType === row.blockType)
      ? existing[index]
      : undefined

    return {
      ...(previous ?? {}),
      id: previous?.id ?? ObjectID().toHexString(),
      ...(isBlocks ? { blockType: row.blockType, blockName: row.blockName ?? previous?.blockName } : {})
    }
  })
}

export const traverseFields = (args: TraverseArgs) => {
  const {
    dataFrom,
    emptyOnly,
    retranslateIdentical,
    isWrongLanguage,
    fields,
    localizedParent,
    path,
    translatedData,
    valuesToTranslate,
    onField,
    _options
  } = args
  const { additionalTraverseRichText } = _options ?? {}
  const siblingDataFrom = args.siblingDataFrom ?? dataFrom
  const siblingDataTranslated = args.siblingDataTranslated ?? translatedData

  // in fill-only modes a target is kept unless it is empty, or still the source copy when asked
  const keepsTarget = (source: unknown, target: unknown) =>
    Boolean(emptyOnly) && hasText(target) &&
    !(retranslateIdentical && (looksUntranslated(source, target) || Boolean(isWrongLanguage?.(target))))

  const recurse = (overrides: Partial<TraverseArgs> & Pick<TraverseArgs, 'fields'>) =>
    traverseFields({ ...args, siblingDataFrom, siblingDataTranslated, ...overrides })

  for (const field of fields) {
    switch (field.type) {
      case 'tabs':
        for (const tab of field.tabs) {
          const hasName = tabHasName(tab)

          const tabDataFrom = hasName
            ? (siblingDataFrom[tab.name] as Record<string, unknown>)
            : siblingDataFrom

          // an empty tab must not end the walk for the tabs and fields after it
          if (!tabDataFrom) continue

          let tabDataTranslated: Record<string, unknown>

          if (hasName) {
            if (!siblingDataTranslated[tab.name])
              siblingDataTranslated[tab.name] = {}

            tabDataTranslated = siblingDataTranslated[tab.name] as Record<string, unknown>
          } else {
            tabDataTranslated = siblingDataTranslated
          }

          recurse({
            fields: tab.fields,
            localizedParent: localizedParent || ('localized' in tab && Boolean(tab.localized)),
            path: hasName ? joinPath(path, tab.name) : path,
            siblingDataFrom: tabDataFrom,
            siblingDataTranslated: tabDataTranslated
          })
        }

        break

      case 'group': {
        // unnamed groups only lay fields out; their data lives on the same level
        if (!('name' in field) || !field.name) {
          recurse({ fields: field.fields })
          break
        }

        const groupDataFrom = siblingDataFrom[field.name] as Record<string, unknown>

        if (!groupDataFrom) break

        if (!siblingDataTranslated[field.name])
          siblingDataTranslated[field.name] = {}

        recurse({
          fields: field.fields,
          localizedParent: localizedParent || Boolean(field.localized),
          path: joinPath(path, field.name),
          siblingDataFrom: groupDataFrom,
          siblingDataTranslated: siblingDataTranslated[field.name] as Record<string, unknown>
        })

        break
      }

      case 'array':
      case 'blocks': {
        const isBlocks = field.type === 'blocks'
        const rowsFrom = siblingDataFrom[field.name] as Row[]

        if (isEmpty(rowsFrom) || !Array.isArray(rowsFrom)) break

        const existing = Array.isArray(siblingDataTranslated[field.name])
          ? (siblingDataTranslated[field.name] as Row[])
          : []

        const localized = Boolean(field.localized || localizedParent)

        const rows = localized
          ? buildLocalizedRows(rowsFrom, existing, isBlocks, emptyOnly)
          : existing.length ? existing : structuredClone(rowsFrom)

        rows.forEach((row, index) => {
          const rowFrom = rowsFrom[index]
          if (!rowFrom) return

          if (!isBlocks) {
            recurse({
              fields: field.fields,
              localizedParent: localized,
              path: `${joinPath(path, field.name)}[${index}]`,
              siblingDataFrom: rowFrom,
              siblingDataTranslated: row
            })
            return
          }

          const block = field.blocks.find((each) => each.slug === row.blockType)
          if (!block) return

          recurse({
            fields: block.fields,
            localizedParent: localized,
            path: `${joinPath(path, field.name)}[${index}](${row.blockType})`,
            siblingDataFrom: rowFrom,
            siblingDataTranslated: row
          })
        })

        siblingDataTranslated[field.name] = rows

        break
      }

      case 'collapsible':
      case 'row':
        recurse({ fields: field.fields })
        break

      case 'date':
      case 'checkbox':
      case 'code':
      case 'email':
      case 'number':
      case 'point':
      case 'radio':
      case 'relationship':
      case 'select':
      case 'upload':
        siblingDataTranslated[field.name] = siblingDataFrom[field.name]
        break

      case 'json': {
        if (!(field.localized || localizedParent)) break

        const jsonDataFrom = siblingDataFrom[field.name]
        if (isEmpty(jsonDataFrom)) break

        const jsonPath = joinPath(path, field.name)
        const current = siblingDataTranslated[field.name]
        const currentIsObject = Boolean(current) && typeof current === 'object'

        // missing-only keeps every key the target already has, and translates the gaps
        const jsonDataTranslated = emptyOnly && currentIsObject
          ? structuredClone(current) as Record<string, unknown>
          : structuredClone(jsonDataFrom) as Record<string, unknown>

        siblingDataTranslated[field.name] = jsonDataTranslated

        const traverseObject = (source: unknown, target: Record<string, unknown>, target0: unknown, objPath: string) => {
          if (!source || typeof source !== 'object') return

          for (const key of Object.keys(source)) {
            const value = (source as Record<string, unknown>)[key]
            const previous = target0 && typeof target0 === 'object' ? (target0 as Record<string, unknown>)[key] : undefined
            const keyPath = joinPath(objPath, key)

            if (typeof value === 'string') {
              onField?.({ path: keyPath, type: 'json', source: value, target: previous })

              if (!value.trim()) continue
              if (keepsTarget(value, previous)) continue

              target[key] = value
              if (isOpaqueText(value)) continue

              valuesToTranslate.push({
                onTranslate: (translated) => {
                  target[key] = translated
                },
                value,
                path: keyPath
              })
            } else if (value && typeof value === 'object') {
              if (!target[key] || typeof target[key] !== 'object')
                target[key] = Array.isArray(value) ? [] : {}

              traverseObject(value, target[key] as Record<string, unknown>, previous, keyPath)
            } else if (!(key in target)) {
              target[key] = value
            }
          }
        }

        traverseObject(jsonDataFrom, jsonDataTranslated, currentIsObject ? current : undefined, jsonPath)
        break
      }

      case 'text':
      case 'textarea': {
        if (field.custom && typeof field.custom === 'object' && field.custom.translatorSkip) break
        if (!(field.localized || localizedParent)) break
        if (field.name === 'blockName' || field.name === 'id') break

        const value = siblingDataFrom[field.name]
        const current = siblingDataTranslated[field.name]
        const fieldPath = joinPath(path, field.name)
        const isSlug = field.name === 'slug'

        onField?.({ path: fieldPath, type: isSlug ? 'slug' : 'text', source: value, target: current })

        if (typeof value !== 'string' || !value.trim()) break

        const hasCurrent = typeof current === 'string' && current.trim().length > 0

        // an existing slug is a live url: never re-translate it
        if (isSlug ? hasCurrent : keepsTarget(value, current)) break

        if (isOpaqueText(value)) {
          siblingDataTranslated[field.name] = value
          break
        }

        if (isSlug) {
          // `_` nests pages; each segment is translated as words and re-slugged
          const segments = value.split('_')

          segments.forEach((segment, index) => {
            valuesToTranslate.push({
              onTranslate: (translated: string) => {
                segments[index] = sanitizeSlug(translated) || segment
                siblingDataTranslated[field.name] = segments.join('_')
              },
              value: segment.replace(/-/g, ' '),
              path: `${fieldPath}#${index}`
            })
          })
          break
        }

        valuesToTranslate.push({
          onTranslate: (translated: string) => {
            siblingDataTranslated[field.name] = translated
          },
          value,
          path: fieldPath
        })
        break
      }

      case 'richText': {
        if (!(field.localized || localizedParent)) break

        const richTextDataFrom = siblingDataFrom[field.name]
        const current = siblingDataTranslated[field.name]
        const richTextPath = joinPath(path, field.name)

        onField?.({ path: richTextPath, type: 'richText', source: richTextDataFrom, target: current })

        if (!richTextDataFrom || !hasText(richTextDataFrom)) break
        if (keepsTarget(richTextDataFrom, current)) break

        const isSlate = Array.isArray(richTextDataFrom)
        const isLexical = typeof richTextDataFrom === 'object' && 'root' in richTextDataFrom

        if (!isSlate && !isLexical) break

        // work on a copy; the source document must stay untouched
        const richTextTranslated = structuredClone(richTextDataFrom) as Record<string, unknown> | unknown[]
        siblingDataTranslated[field.name] = richTextTranslated

        let richTextNodeIndex = 0

        const onText = (siblingData: Record<string, unknown>, attribute = 'text') => {
          valuesToTranslate.push({
            onTranslate: (translated: string) => {
              siblingData[attribute] = translated
            },
            value: siblingData[attribute],
            path: `${richTextPath}#${richTextNodeIndex++}`
          })
        }

        const roots = isLexical
          ? [(richTextTranslated as Record<string, unknown>).root]
          : (richTextTranslated as unknown[])

        for (const root of roots) {
          if (root && typeof root === 'object')
            traverseRichText({ onText, root: root as Record<string, unknown>, additionalTraverseRichText })
        }

        break
      }

      default:
        break
    }
  }
}
