import type { Block, FlattenedBlock, RichTextField } from 'payload'
import type { LlmsBlockData, ResolveLink, RichTextToMarkdown, SerializeBlock } from './fieldsToMarkdown'
import { fieldsToMarkdown, lexicalToPlainText } from './fieldsToMarkdown'

type LexicalModule = Pick<typeof import('@payloadcms/richtext-lexical'), 'convertLexicalToMarkdown' | 'editorConfigFactory'>
type EditorConfig = ReturnType<LexicalModule['editorConfigFactory']['fromField']>

type SerializedNode = { type?: string; children?: SerializedNode[]; fields?: LlmsBlockData; [key: string]: unknown }
type SerializedState = { root: SerializedNode }

// registered by lexical itself, never listed among a payload editor's feature nodes
const CORE_NODES = ['root', 'paragraph', 'text', 'linebreak', 'tab']

export type LexicalToMarkdownArgs = {
  lexical: LexicalModule
  serializeBlock?: SerializeBlock
  /** The sanitized config's `blocks`, to resolve block slugs a BlocksFeature references. */
  blocks?: (Block | FlattenedBlock)[]
  /** Passed on to the field walk of blocks inside rich text. */
  resolveLink?: ResolveLink
}

/**
 * Rich text to markdown through `convertLexicalToMarkdown` with the field's own editor config.
 * Lexical renders BlocksFeature nodes as the literal "Block Field", so `block` nodes are cut out
 * and rendered with `serializeBlock` or the generic field walk, and `inlineBlock` nodes are
 * replaced by their text. Lexical also swallows parse errors for unregistered node types and
 * returns the content before them, so a tree with a node type the editor doesn't know falls back
 * to plain text instead.
 */
export function createLexicalToMarkdown({ lexical, serializeBlock, blocks, resolveLink }: LexicalToMarkdownArgs): RichTextToMarkdown {
  const toMarkdown: RichTextToMarkdown = ({ field, data }) => {
    const state = data as SerializedState
    if (!state?.root || !Array.isArray(state.root.children)) return ''

    let editorConfig: EditorConfig
    try {
      editorConfig = lexical.editorConfigFactory.fromField({ field })
    } catch {
      return lexicalToPlainText(data)
    }

    const known = new Set([...CORE_NODES, ...registeredNodeTypes(editorConfig)])
    if (!everyNodeKnown(state.root, known)) return lexicalToPlainText(data)

    const blockConfigs = blocksOf(editorConfig, blocks)
    const renderBlock = (fields: LlmsBlockData | undefined) => {
      if (!fields || typeof fields.blockType !== 'string') return ''
      const custom = serializeBlock?.(fields)
      if (custom !== undefined) return custom.trim()
      const config = blockConfigs.find(block => block.slug === fields.blockType)
      const own = config?.custom?.['@justanarthur/payload-www'] as { markdown?: boolean } | undefined
      if (own?.markdown === false) return ''
      return config ? fieldsToMarkdown({ fields: config.fields, data: fields, blocks, serializeBlock, resolveLink, richTextToMarkdown: toMarkdown }) : ''
    }

    const convert = (children: SerializedNode[]) => {
      if (children.length === 0) return ''
      try {
        return lexical.convertLexicalToMarkdown({
          data: { root: { ...state.root, children: children.map(child => inlineBlocksToText(child, renderBlock)) } } as never,
          editorConfig
        }).trim()
      } catch {
        return lexicalToPlainText({ root: { ...state.root, children } })
      }
    }

    // top-level block nodes split the tree; each run between them converts on its own
    const parts: string[] = []
    let run: SerializedNode[] = []
    for (const child of state.root.children) {
      if (child.type !== 'block') {
        run.push(child)
        continue
      }
      parts.push(convert(run), renderBlock(child.fields))
      run = []
    }
    parts.push(convert(run))
    return parts.filter(Boolean).join('\n\n')
  }

  return toMarkdown
}

function registeredNodeTypes(editorConfig: EditorConfig): string[] {
  return (editorConfig.features?.nodes ?? []).flatMap(entry => {
    const node = ('node' in entry ? entry.node : entry) as { getType?: () => string; replace?: { getType?: () => string } }
    const type = node.getType?.() ?? node.replace?.getType?.()
    return type ? [type] : []
  })
}

function everyNodeKnown(node: SerializedNode, known: Set<string>): boolean {
  if (typeof node.type === 'string' && !known.has(node.type)) return false
  return (node.children ?? []).every(child => everyNodeKnown(child, known))
}

function blocksOf(editorConfig: EditorConfig, configBlocks: (Block | FlattenedBlock)[] = []) {
  const feature = editorConfig.resolvedFeatureMap?.get('blocks') as
    | { sanitizedServerFeatureProps?: { blocks?: (Block | string)[]; inlineBlocks?: (Block | string)[] } }
    | undefined
  const props = feature?.sanitizedServerFeatureProps
  return [...(props?.blocks ?? []), ...(props?.inlineBlocks ?? [])]
    .map(block => typeof block === 'string' ? configBlocks.find(b => b.slug === block) : block)
    .filter((block): block is Block | FlattenedBlock => !!block)
}

function inlineBlocksToText(node: SerializedNode, renderBlock: (fields?: LlmsBlockData) => string): SerializedNode {
  if (node.type === 'inlineBlock') {
    const text = renderBlock(node.fields).replace(/\s+/g, ' ').trim()
    return { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }
  }
  return node.children ? { ...node, children: node.children.map(child => inlineBlocksToText(child, renderBlock)) } : node
}
