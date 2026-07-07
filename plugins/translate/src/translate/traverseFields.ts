import ObjectID from 'bson-objectid'
import type { Field } from 'payload'
import { tabHasName } from 'payload/shared'

import { isEmpty } from '../utils/isEmpty'
import { sanitizeSlug } from '../utils/sanitizeSlug'
import { traverseRichText } from './traverseRichText'
import type { ValueToTranslate } from './types'

/** Append a named segment to a field path, handling the empty root. */
const joinPath = (base: string | undefined, segment: string) =>
  base ? `${base}.${segment}` : segment

export const traverseFields = ({
                                 dataFrom,
                                 emptyOnly,
                                 fields,
                                 localizedParent,
                                 path,
                                 siblingDataFrom,
                                 siblingDataTranslated,
                                 translatedData,
                                 valuesToTranslate,

                                 _options
                               }: {
  dataFrom: Record<string, unknown>
  emptyOnly?: boolean
  fields: Field[]
  localizedParent?: boolean
  path?: string
  siblingDataFrom?: Record<string, unknown>
  siblingDataTranslated?: Record<string, unknown>
  translatedData: Record<string, unknown>
  valuesToTranslate: ValueToTranslate[],

  _options?: {
    additionalTraverseRichText?: Parameters<typeof traverseRichText>[0]['additionalTraverseRichText']
  }
}) => {
  const { additionalTraverseRichText } = _options ?? {}
  siblingDataFrom = siblingDataFrom ?? dataFrom
  siblingDataTranslated = siblingDataTranslated ?? translatedData

  for (const field of fields) {
    switch (field.type) {
      case 'tabs':
        for (const tab of field.tabs) {
          const hasName = tabHasName(tab)

          const tabDataFrom = hasName
            ? (siblingDataFrom[tab.name] as Record<string, unknown>)
            : siblingDataFrom

          if (!tabDataFrom) return

          let tabDataTranslated: Record<string, unknown>

          if (hasName) {
            if (!siblingDataTranslated[tab.name])
              siblingDataTranslated[tab.name] = {}

            tabDataTranslated = siblingDataTranslated[tab.name] as Record<string, unknown>
          } else {
            tabDataTranslated = siblingDataTranslated
          }

          traverseFields({
            dataFrom,
            emptyOnly,
            fields: tab.fields,
            localizedParent: localizedParent ?? tab.localized,
            path: hasName ? joinPath(path, tab.name) : path,
            siblingDataFrom: tabDataFrom,
            siblingDataTranslated: tabDataTranslated,
            translatedData,
            valuesToTranslate,
            _options
          })
        }

        break

      case 'group': {
        if (!('name' in field)) break

        const groupDataFrom = siblingDataFrom[field.name] as Record<string, unknown>

        if (!groupDataFrom) break

        if (!siblingDataTranslated[field.name])
          siblingDataTranslated[field.name] = {}

        const groupDataTranslated = siblingDataTranslated[field.name] as Record<string, unknown>

        traverseFields({
          dataFrom,
          emptyOnly,
          fields: field.fields,
          localizedParent: localizedParent ?? field.localized,
          path: joinPath(path, field.name),
          siblingDataFrom: groupDataFrom,
          siblingDataTranslated: groupDataTranslated,
          translatedData,
          valuesToTranslate,
          _options
        })

        break
      }

      case 'array': {
        const arrayDataFrom = siblingDataFrom[field.name] as {
          id: string
        }[]

        if (isEmpty(arrayDataFrom)) break

        if (!siblingDataTranslated[field.name])
          siblingDataTranslated[field.name] = []

        let arrayDataTranslated = siblingDataTranslated[field.name] as { id: string }[]

        if (field.localized || localizedParent) {
          if (arrayDataTranslated.length > 0 && emptyOnly) break

          arrayDataTranslated = arrayDataFrom.map(() => ({
            id: ObjectID().toHexString()
          }))
        }

        arrayDataTranslated.forEach((item, index) => {
          traverseFields({
            dataFrom,
            emptyOnly,
            fields: field.fields,
            localizedParent: localizedParent ?? field.localized,
            path: `${joinPath(path, field.name)}[${index}]`,
            siblingDataFrom: arrayDataFrom[index],
            siblingDataTranslated: item,
            translatedData,
            valuesToTranslate,
            _options
          })
        })

        siblingDataTranslated[field.name] = arrayDataTranslated

        break
      }

      case 'blocks': {
        const blocksDataFrom = siblingDataFrom[field.name] as {
          blockType: string
          id: string
        }[]

        if (isEmpty(blocksDataFrom)) break

        if (!siblingDataTranslated[field.name])
          siblingDataTranslated[field.name] = []

        let blocksDataTranslated = siblingDataTranslated[field.name] as { blockType: string; id: string }[]

        if (field.localized || localizedParent) {
          if (blocksDataTranslated.length > 0 && emptyOnly) break

          blocksDataTranslated = blocksDataFrom.map(({ blockType }) => ({
            blockType,
            id: ObjectID().toHexString()
          }))
        }

        blocksDataTranslated.forEach((item, index) => {
          const block = field.blocks.find((each) => each.slug === item.blockType)

          if (!block) return

          traverseFields({
            dataFrom,
            emptyOnly,
            fields: block.fields,
            localizedParent: localizedParent ?? field.localized,
            path: `${joinPath(path, field.name)}[${index}](${item.blockType})`,
            siblingDataFrom: blocksDataFrom[index],
            siblingDataTranslated: item,
            translatedData,
            valuesToTranslate,
            _options
          })
        })

        siblingDataTranslated[field.name] = blocksDataTranslated

        break
      }

      case 'collapsible':
      case 'row':
        traverseFields({
          dataFrom,
          emptyOnly,
          fields: field.fields,
          localizedParent,
          path,
          siblingDataFrom,
          siblingDataTranslated,
          translatedData,
          valuesToTranslate,
          _options
        })
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

      case 'json':
        if (!(field.localized || localizedParent)) break
        if (isEmpty(siblingDataFrom[field.name])) break
        if (emptyOnly && siblingDataTranslated[field.name]) break

        const jsonDataFrom = siblingDataFrom[field.name]
        const jsonDataTranslated = JSON.parse(JSON.stringify(jsonDataFrom))
        siblingDataTranslated[field.name] = jsonDataTranslated

      function traverseObject(obj: Record<string, any>, objPath: string) {
        if (!obj || typeof obj !== 'object') return

        for (const key in obj) {
          const value = obj[key]

          if (typeof value === 'string' && value.trim()) {
            ((parentObj, parentKey, parentValue, parentPath) => {
              valuesToTranslate.push({
                onTranslate: (translated) => {
                  parentObj[parentKey] = translated
                },
                value: parentValue,
                path: parentPath
              })
            })(obj, key, value, joinPath(objPath, key))
          } else if (typeof value === 'object' && value !== null) {
            traverseObject(value, joinPath(objPath, key))
          }
        }
      }

        traverseObject(jsonDataTranslated, joinPath(path, field.name))
        break

      case 'text':
      case 'textarea':
        if (field.custom && typeof field.custom === 'object' && field.custom.translatorSkip) break

        if (!(field.localized || localizedParent) || isEmpty(siblingDataFrom[field.name])) break
        if (emptyOnly && siblingDataTranslated[field.name]) break


        if (field.name === 'blockName' || field.name === 'id') {
          break
        }

        valuesToTranslate.push({
          onTranslate: (translated: string) => {
            siblingDataTranslated[field.name] = field.name === 'slug' ? sanitizeSlug(translated) : translated
          },
          value: siblingDataFrom[field.name],
          path: joinPath(path, field.name)
        })
        break

      case 'richText': {
        if (!(field.localized || localizedParent) || isEmpty(siblingDataFrom[field.name])) break
        if (emptyOnly && siblingDataTranslated[field.name]) break

        const richTextDataFrom = siblingDataFrom[field.name] as object

        siblingDataTranslated[field.name] = richTextDataFrom

        if (!richTextDataFrom) break

        const isSlate = Array.isArray(richTextDataFrom)

        const isLexical = 'root' in richTextDataFrom

        if (!isSlate && !isLexical) break

        const richTextPath = joinPath(path, field.name)
        let richTextNodeIndex = 0

        if (isLexical) {
          const root = (siblingDataTranslated[field.name] as Record<string, unknown>)
            ?.root as Record<string, unknown>

          if (root)
            traverseRichText({
              onText: (siblingData, attribute = 'text') => {
                valuesToTranslate.push({
                  onTranslate: (translated: string) => {
                    siblingData[attribute] = translated
                  },
                  value: siblingData[attribute],
                  path: `${richTextPath}#${richTextNodeIndex++}`
                })
              },
              root,

              additionalTraverseRichText
            })
        } else {
          for (const root of siblingDataTranslated[field.name] as unknown[]) {
            traverseRichText({
              onText: (siblingData, attribute = 'text') => {
                valuesToTranslate.push({
                  onTranslate: (translated: string) => {
                    siblingData[attribute] = translated
                  },
                  value: siblingData[attribute],
                  path: `${richTextPath}#${richTextNodeIndex++}`
                })
              },
              root: root as Record<string, unknown>,

              additionalTraverseRichText
            })
          }
        }

        break
      }

      default:
        break
    }
  }
}
