import { describe, expect, it, vi } from 'vitest'
import { buildConfig, type RichTextField } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

vi.mock('../src/render/metadata/query', () => ({ queryGlobal: vi.fn() }))

import { buildLlmsDocument, type LlmsSource } from '../src/render/llms/createLlmsTxt'

const text = (t: string, format = 0) => ({ type: 'text', text: t, format, version: 1, detail: 0, mode: 'normal', style: '' })
const el = (type: string, children: unknown[], extra: Record<string, unknown> = {}) =>
  ({ type, children, version: 1, direction: 'ltr', format: '', indent: 0, ...extra })

const content = {
  root: el('root', [
    el('heading', [text('Features')], { tag: 'h2' }),
    el('paragraph', [text('Bookings '), text('in one place', 1)], { textFormat: 0, textStyle: '' }),
    el('list', [el('listitem', [text('Fleet')], { value: 1 }), el('listitem', [text('Invoicing')], { value: 2 })], { listType: 'bullet', start: 1, tag: 'ul' })
  ])
}

describe('llms-full.txt rich text', () => {
  it('converts lexical rich text to markdown with the field\'s own editor config', async () => {
    const config = await buildConfig({
      secret: 'test',
      db: { defaultIDType: 'number', init: () => ({}) } as never,
      editor: lexicalEditor(),
      collections: [{ slug: 'posts', fields: [{ name: 'title', type: 'text' }, { name: 'content', type: 'richText' }] }]
    })
    const source: LlmsSource = {
      collectionSlug: 'posts',
      payloadConfig: config,
      getRouting: async () => ({ locales: ['en'], defaultLocale: 'en' }),
      getServerSideURL: () => 'https://x.test',
      listDocs: async () => [{ doc: { id: 1, title: 'Post', content }, url: 'https://x.test/posts/post', alternates: { canonical: '', languages: {} }, lastModified: '' }]
    }
    const field = config.collections.find(c => c.slug === 'posts')!.fields.find(f => 'name' in f && f.name === 'content') as RichTextField
    expect(field.editor).toBeTruthy()

    const doc = await buildLlmsDocument([source], { name: 'X' }, true)
    expect(doc.sections[0].links[0].content).toBe('## Features\n\nBookings **in one place**\n\n- Fleet\n- Invoicing')
  })
})
