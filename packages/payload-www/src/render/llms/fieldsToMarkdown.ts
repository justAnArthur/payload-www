import type { Block, Field, FlattenedBlock, RichTextField } from 'payload'

/** Data of one row of a `blocks` field, as stored on the document. */
export type LlmsBlockData = { blockType: string; [key: string]: unknown }

/**
 * Turns one layout block into markdown for `llms-full.txt`. Return a string to replace the
 * generic output for that block (`''` drops it), or `undefined` to fall back to the generic walk.
 */
export type SerializeBlock = (block: LlmsBlockData) => string | undefined

export type RichTextToMarkdown = (args: { field: RichTextField; data: unknown }) => string

export type FieldsToMarkdownArgs = {
  fields: Field[]
  data: unknown
  richTextToMarkdown: RichTextToMarkdown
  serializeBlock?: SerializeBlock
  /** Resolves `blockReferences` slugs; pass the sanitized config's `blocks`. */
  blocks?: (Block | FlattenedBlock)[]
}

// slug and the SEO group carry no page content; the SEO description is already the summary line
const SKIPPED_NAMES = new Set(['slug', 'meta'])
// link targets, anchors, css hooks — values a reader would see as noise, not copy
const NON_PROSE = /^(?:https?:\/\/|\/|#|mailto:|tel:)\S*$/

/**
 * Walks a document by its field schema and emits the human-facing copy as markdown: text and
 * textarea values as paragraphs, rich text through `richTextToMarkdown`, and blocks, arrays,
 * groups, rows, collapsibles and tabs recursively. Relationships, uploads, selects, numbers,
 * dates and other non-prose fields are left out.
 */
export function fieldsToMarkdown(args: FieldsToMarkdownArgs): string {
  return walkFields(args.fields, args.data, args).filter(Boolean).join('\n\n')
}

function walkFields(fields: Field[], data: unknown, args: FieldsToMarkdownArgs): string[] {
  if (!data || typeof data !== 'object') return []
  const record = data as Record<string, unknown>

  return fields.flatMap((field): string[] => {
    if ('hidden' in field && field.hidden) return []
    if (field.admin && 'hidden' in field.admin && field.admin.hidden) return []
    if ('name' in field && SKIPPED_NAMES.has(field.name)) return []

    switch (field.type) {
      case 'text':
      case 'textarea': {
        const value = record[field.name]
        const values = Array.isArray(value) ? value : [value]
        return values
          .filter((v): v is string => typeof v === 'string')
          .map(v => v.trim())
          .filter(v => v && !NON_PROSE.test(v))
      }
      case 'richText': {
        const value = record[field.name]
        if (!value || typeof value !== 'object') return []
        return [args.richTextToMarkdown({ field, data: value }).trim()]
      }
      case 'group':
        return 'name' in field && field.name
          ? walkFields(field.fields, record[field.name], args)
          : walkFields(field.fields, record, args)
      case 'row':
      case 'collapsible':
        return walkFields(field.fields, record, args)
      case 'tabs':
        return field.tabs.flatMap(tab =>
          'name' in tab && tab.name
            ? walkFields(tab.fields, record[tab.name], args)
            : walkFields(tab.fields, record, args))
      case 'array': {
        const rows = record[field.name]
        return Array.isArray(rows) ? rows.flatMap(row => walkFields(field.fields, row, args)) : []
      }
      case 'blocks': {
        const rows = record[field.name]
        if (!Array.isArray(rows)) return []
        const configs = [...(field.blocks ?? []), ...(field.blockReferences ?? [])]
          .map(block => typeof block === 'string' ? args.blocks?.find(b => b.slug === block) : block)
        return rows.flatMap((row): string[] => {
          if (!row || typeof row !== 'object' || typeof row.blockType !== 'string') return []
          const custom = args.serializeBlock?.(row as LlmsBlockData)
          if (custom !== undefined) return [custom.trim()]
          const block = configs.find(b => b?.slug === row.blockType)
          return block ? [walkFields(block.fields, row, args).filter(Boolean).join('\n\n')] : []
        })
      }
      default:
        return []
    }
  })
}

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

/** Last-resort rich text reader: the text of every node, one paragraph per top-level node. */
export function lexicalToPlainText(data: unknown): string {
  const root = (data as { root?: LexicalNode } | null)?.root
  const text = (node: LexicalNode): string =>
    (node.text ?? '') + (node.children ?? []).map(text).join(node.type === 'list' ? '\n' : '')
  return (root?.children ?? []).map(text).map(s => s.trim()).filter(Boolean).join('\n\n')
}
