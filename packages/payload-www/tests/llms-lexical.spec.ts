import { beforeAll, describe, expect, it, vi } from 'vitest'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, type SanitizedConfig } from 'payload'

vi.mock('../src/render/metadata/query', () => ({ queryGlobal: vi.fn() }))

import { buildLlmsDocument, type LlmsFullTxtOptions, type LlmsSource } from '../src/render/llms/createLlmsTxt'

const text = (t: string, format = 0) => ({ type: 'text', text: t, format, version: 1, detail: 0, mode: 'normal', style: '' })
const el = (type: string, children: unknown[], extra: Record<string, unknown> = {}) =>
  ({ type, children, version: 1, direction: 'ltr', format: '', indent: 0, ...extra })
const p = (...children: unknown[]) => el('paragraph', children.map(c => typeof c === 'string' ? text(c) : c), { textFormat: 0, textStyle: '' })
const state = (...children: unknown[]) => ({ root: el('root', children) })
const block = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: 'b1', blockName: 'Editor label', ...fields } })
const inlineBlock = (fields: Record<string, unknown>) => ({ type: 'inlineBlock', version: 1, fields: { id: 'i1', blockName: 'Editor label', ...fields } })

let config: SanitizedConfig

beforeAll(async () => {
  config = await buildConfig({
    secret: 'test',
    db: { defaultIDType: 'number', init: () => ({}) } as never,
    editor: lexicalEditor(),
    blocks: [{ slug: 'quote', fields: [{ name: 'quote', type: 'textarea' }, { name: 'author', type: 'text' }] }],
    collections: [
      {
        slug: 'posts',
        fields: [
          { name: 'title', type: 'text' },
          {
            name: 'content',
            type: 'richText',
            editor: lexicalEditor({
              features: ({ defaultFeatures }) => [
                ...defaultFeatures,
                BlocksFeature({
                  blocks: ['quote', { slug: 'cta', fields: [{ name: 'label', type: 'text' }] }],
                  inlineBlocks: [{ slug: 'chip', fields: [{ name: 'label', type: 'text' }] }]
                })
              ]
            })
          },
          { name: 'layout', type: 'blocks', blocks: [{ slug: 'hero', fields: [{ name: 'heading', type: 'text' }] }] }
        ]
      }
    ]
  })
})

async function fullContent(doc: Record<string, unknown>, options: LlmsFullTxtOptions = {}) {
  const source: LlmsSource = {
    collectionSlug: 'posts',
    payloadConfig: config,
    getRouting: async () => ({ locales: ['en'], defaultLocale: 'en' }),
    getServerSideURL: () => 'https://x.test',
    listDocs: async () => [{ doc: { id: 1, title: 'Post', ...doc }, url: 'https://x.test/posts/post', alternates: { canonical: '', languages: {} }, lastModified: '' }]
  }
  return (await buildLlmsDocument([source], { name: 'X', ...options }, true)).sections[0].links[0].content
}

describe('llms-full.txt rich text', () => {
  it('converts lexical rich text to markdown with the field\'s own editor config', async () => {
    const content = state(
      el('heading', [text('Features')], { tag: 'h2' }),
      p('Bookings ', text('in one place', 1)),
      el('list', [el('listitem', [text('Fleet')], { value: 1 }), el('listitem', [text('Invoicing')], { value: 2 })], { listType: 'bullet', start: 1, tag: 'ul' })
    )
    expect(await fullContent({ content })).toBe('## Features\n\nBookings **in one place**\n\n- Fleet\n- Invoicing')
  })

  // regression: payload adds `id` (hidden) and `blockName` (disabled) to every block
  it('leaves the editor-only blockName and id of layout blocks out', async () => {
    expect(await fullContent({ layout: [{ id: 'abc123', blockName: 'Hero (draft copy)', blockType: 'hero', heading: 'Rent smarter' }] }))
      .toBe('Rent smarter')
  })

  // regression: lexical reports unregistered nodes to onError and returns the content before them
  it('falls back to plain text when the tree has a node type the editor does not know', async () => {
    expect(await fullContent({ content: state(p('Before'), { type: 'mystery', version: 1 }, p('After')) }))
      .toBe('Before\n\nAfter')
  })

  // regression: lexical prints BlocksFeature nodes as the literal "Block Field"
  it('renders BlocksFeature blocks and inline blocks from their fields', async () => {
    const content = state(
      p('Intro with ', inlineBlock({ blockType: 'chip', label: 'GPS' }), ' inside.'),
      block({ blockType: 'quote', quote: 'Paperless at last.', author: 'AVIS Slovakia' }),
      block({ blockType: 'cta', label: 'Book a demo' }),
      p('Outro')
    )
    const out = await fullContent({ content })
    expect(out).toBe('Intro with GPS inside.\n\nPaperless at last.\n\nAVIS Slovakia\n\nBook a demo\n\nOutro')
    expect(out).not.toContain('Block Field')
    expect(out).not.toContain('Editor label')
  })

  it('lets serializeBlock render or drop rich text blocks too', async () => {
    const content = state(p('Intro'), block({ blockType: 'quote', quote: 'Q', author: 'A' }), block({ blockType: 'cta', label: 'Go' }))
    expect(await fullContent({ content }, {
      serializeBlock: b => b.blockType === 'quote' ? `> ${b.quote} — ${b.author}` : b.blockType === 'cta' ? '' : undefined
    })).toBe('Intro\n\n> Q — A')
  })
})
