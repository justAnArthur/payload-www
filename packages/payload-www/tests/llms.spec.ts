import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Field, SanitizedConfig } from 'payload'

const { queryGlobal } = vi.hoisted(() => ({ queryGlobal: vi.fn() }))
vi.mock('../src/render/metadata/query', () => ({ queryGlobal }))

import {
  buildLlmsDocument,
  createLlmsFullTxtFromCollections,
  createLlmsTxtFromCollections,
  type LlmsSource
} from '../src/render/llms/createLlmsTxt'
import { fieldsToMarkdown, lexicalToPlainText, type RichTextToMarkdown } from '../src/render/llms/fieldsToMarkdown'
import { renderLlmsFullTxt, renderLlmsTxt } from '../src/render/llms/renderLlmsTxt'
import type { createCollectionPageExports } from '../src/render/pages/createCollectionPageExports'

// the page exports' generateSitemap is what hosts pass in, so it has to satisfy the source type
type GenerateSitemap = ReturnType<typeof createCollectionPageExports>['generateSitemap']
const _sitemapIsSource: GenerateSitemap extends LlmsSource ? true : false = true

const siteUrl = 'https://www.example.com'
const routing = { locales: ['en', 'sk'], defaultLocale: 'en' }

const paragraph = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })
const richText = (...texts: string[]) => ({ root: { type: 'root', children: texts.map(paragraph) } })

const heroBlock = {
  slug: 'hero',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'body', type: 'richText' },
    { name: 'link', type: 'group', fields: [{ name: 'label', type: 'text' }, { name: 'url', type: 'text' }] }
  ]
}
const statsBlock = { slug: 'stats', fields: [{ name: 'items', type: 'array', fields: [{ name: 'value', type: 'number' }, { name: 'label', type: 'text' }] }] }

const pagesFields = [
  { name: 'title', type: 'text' },
  { type: 'tabs', tabs: [{ label: 'Content', fields: [{ name: 'blocks', type: 'blocks', blocks: [heroBlock], blockReferences: ['stats'] }] }] },
  { name: 'slug', type: 'text' },
  { name: 'meta', type: 'group', fields: [] }
] as unknown as Field[]

const config = {
  collections: [
    { slug: 'pages', labels: { plural: 'Pages' }, admin: { useAsTitle: 'title' }, fields: pagesFields },
    { slug: 'posts', labels: { plural: { en: 'Posts', sk: 'Články' } }, admin: { useAsTitle: 'title' }, fields: [{ name: 'title', type: 'text' }, { name: 'content', type: 'richText' }] }
  ],
  globals: [{ slug: 'llms' }, { slug: 'metadata' }],
  blocks: [statsBlock]
} as unknown as SanitizedConfig

type Doc = Record<string, any>
const pages: Doc[] = [
  {
    id: 1, slug: '', title: 'Home', meta: { content: { title: 'Example — rental software', description: 'Run a rental business.' } },
    blocks: [
      { blockType: 'hero', heading: 'Rent smarter', body: richText('All bookings in one place.'), link: { label: 'Book a demo', url: '/demo' } },
      { blockType: 'stats', items: [{ value: 40, label: 'countries' }] }
    ]
  },
  { id: 2, slug: 'pricing', title: 'Pricing', blocks: [] },
  { id: 3, slug: 'about', title: 'About [us]', meta: { content: { description: 'Who we are.' } }, blocks: [] }
]
const posts: Doc[] = [{ id: 10, slug: 'hello', title: 'Hello', content: richText('First post.', 'Second paragraph.') }]

const source = (collectionSlug: string, docs: Doc[], prefix = ''): LlmsSource => ({
  collectionSlug,
  payloadConfig: Promise.resolve(config),
  getRouting: async () => routing,
  getServerSideURL: () => siteUrl,
  listDocs: async (locale = 'en') => docs.map(doc => {
    const path = `${locale === 'en' ? '' : '/' + locale}${prefix}${doc.slug ? '/' + doc.slug : ''}`
    return { doc, url: siteUrl + path, alternates: { canonical: siteUrl + path, languages: {} }, lastModified: '' }
  })
})

const sources = [source('pages', pages), source('posts', posts, '/posts')]

let globals: Record<string, unknown>
beforeEach(() => {
  globals = {}
  queryGlobal.mockReset()
  queryGlobal.mockImplementation(async ({ globalSlug }: { globalSlug: string }) => globals[globalSlug] ?? null)
})

describe('renderLlmsTxt', () => {
  it('prints the llmstxt.org shape: title, summary, sections of links', () => {
    expect(renderLlmsTxt({
      name: 'Example',
      summary: 'Rental\nsoftware.',
      locales: ['en', 'sk'],
      sections: [
        { title: 'Pages', links: [{ title: 'About [us]', url: 'https://x/about', description: 'Who we are.' }, { title: 'Home', url: 'https://x' }] },
        { title: 'Empty', links: [] }
      ],
      extra: '## Optional\n\n- [Docs](https://docs.x)'
    })).toBe([
      '# Example',
      '> Rental software.',
      'Available languages: en, sk. Each page lists its translations as hreflang alternates.',
      '## Pages',
      '- [About \\[us\\]](https://x/about): Who we are.\n- [Home](https://x)',
      '## Optional\n\n- [Docs](https://docs.x)'
    ].join('\n\n') + '\n')
  })

  it('inlines content under each link in the full variant, demoting its headings', () => {
    const out = renderLlmsFullTxt({
      name: 'Example',
      sections: [{ title: 'Posts', links: [{ title: 'Hello', url: 'https://x/hello', description: 'Intro', content: '# Big\n\nText' }] }]
    })
    expect(out).toBe('# Example\n\n## Posts\n\n### [Hello](https://x/hello)\n\n> Intro\n\n#### Big\n\nText\n')
  })

  it('maps the top heading of the content to #### and keeps the others relative to it', () => {
    const out = renderLlmsFullTxt({
      name: 'X',
      sections: [{ title: 'S', links: [{ title: 'P', url: 'https://x', content: '## Top\n\n### Sub\n\n#### Deep\n\n##### Deeper' }] }]
    })
    expect(out).toContain('#### Top\n\n##### Sub\n\n###### Deep\n\n###### Deeper')
  })
})

describe('fieldsToMarkdown', () => {
  const richTextToMarkdown: RichTextToMarkdown = ({ data }) => lexicalToPlainText(data)

  it('walks tabs, blocks, block references, groups and arrays, skipping links and non-text fields', () => {
    const out = fieldsToMarkdown({ fields: pagesFields, data: pages[0], blocks: config.blocks, richTextToMarkdown })
    expect(out).toBe('Home\n\nRent smarter\n\nAll bookings in one place.\n\nBook a demo\n\ncountries')
  })

  it('lets serializeBlock replace or drop a block, and falls back for undefined', () => {
    const out = fieldsToMarkdown({
      fields: pagesFields, data: pages[0], blocks: config.blocks, richTextToMarkdown,
      serializeBlock: block => block.blockType === 'stats' ? '' : block.blockType === 'hero' ? `## ${block.heading}` : undefined
    })
    expect(out).toBe('Home\n\n## Rent smarter')
  })
})

describe('buildLlmsDocument', () => {
  it('lists every collection under its plural label with meta titles and descriptions', async () => {
    const res = await createLlmsTxtFromCollections(sources, { name: 'Example', summary: 'Rental software.' })()
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    const body = await res.text()
    expect(body).toContain('# Example\n\n> Rental software.')
    expect(body).toContain('## Pages\n\n- [Example — rental software](https://www.example.com): Run a rental business.\n- [About \\[us\\]](https://www.example.com/about): Who we are.\n- [Pricing](https://www.example.com/pricing)')
    expect(body).toContain('## Posts\n\n- [Hello](https://www.example.com/posts/hello)')
  })

  it('falls back to the metadata global, then the host name', async () => {
    globals.metadata = { shared: { name: 'Meta name', description: 'Meta description' } }
    const doc = await buildLlmsDocument(sources, {})
    expect([doc.name, doc.summary]).toEqual(['Meta name', 'Meta description'])

    globals.metadata = null
    expect((await buildLlmsDocument(sources, {})).name).toBe('www.example.com')
  })

  it('applies code options: locale, section titles, exclusions, hidden locales', async () => {
    const doc = await buildLlmsDocument(sources, {
      locale: 'sk',
      showLocales: false,
      sections: { pages: 'Product', posts: false },
      exclude: [2, '/sk/about/']
    })
    expect(doc.locales).toBeUndefined()
    expect(doc.sections).toEqual([{ title: 'Product', links: [expect.objectContaining({ url: 'https://www.example.com/sk' })] }])
    expect(queryGlobal).toHaveBeenCalledWith(expect.objectContaining({ globalSlug: 'llms', locale: 'sk' }))
  })

  it('cuts sections by path across collections, before the collection sections', async () => {
    const doc = await buildLlmsDocument([source('pages', pages), source('posts', posts, '/posts')], {
      locale: 'sk',
      showLocales: false,
      pathSections: [{ path: 'posts/', title: 'Blog' }, { path: '/about', title: 'Company' }, { path: '/', title: 'Home' }]
    })
    expect(doc.sections.map(s => [s.title, s.links.map(l => l.url.replace(siteUrl, ''))])).toEqual([
      ['Blog', ['/sk/posts/hello']],
      ['Company', ['/sk/about']],
      ['Home', ['/sk']],
      ['Pages', ['/sk/pricing']],
      ['Články', []]
    ])
  })

  it('lets the global path sections replace the code ones', async () => {
    globals.llms = { pathSections: [{ path: '/pricing', title: 'Plans' }, { path: '', title: 'ignored' }] }
    const doc = await buildLlmsDocument(sources, { pathSections: [{ path: '/about', title: 'Company' }] })
    expect(doc.sections.map(s => s.title)).toEqual(['Plans', 'Pages', 'Posts'])
    expect(doc.sections[1].links.map(l => l.url)).toContain('https://www.example.com/about')
  })

  it('lets the llms global override code options', async () => {
    globals.llms = {
      siteName: 'From global',
      summary: '',
      showLocales: false,
      collections: [{ collection: 'pages', exclude: true }, { collection: 'posts', title: 'Blog' }],
      exclude: [{ value: 'hello' }],
      extra: '## Optional'
    }
    const doc = await buildLlmsDocument(sources, { name: 'From code', summary: 'Code summary', sections: { posts: false } })
    expect(doc).toEqual({
      name: 'From global',
      summary: 'Code summary',
      details: undefined,
      locales: undefined,
      sections: [{ title: 'Blog', links: [] }],
      extra: '## Optional'
    })
  })

  it('skips globals the config does not register', async () => {
    const bare = { ...config, globals: [] } as unknown as SanitizedConfig
    await buildLlmsDocument([{ ...sources[0], payloadConfig: bare }], { globalSlug: 'llms' })
    expect(queryGlobal).not.toHaveBeenCalled()
  })

  it('renders llms-full.txt with page content, without repeating the title field', async () => {
    const body = await (await createLlmsFullTxtFromCollections(sources, {
      name: 'Example',
      richTextToMarkdown: ({ data }) => lexicalToPlainText(data)
    })()).text()
    expect(body).toContain('### [Example — rental software](https://www.example.com)\n\n> Run a rental business.\n\nRent smarter\n\nAll bookings in one place.')
    expect(body).toContain('### [Hello](https://www.example.com/posts/hello)\n\nFirst post.\n\nSecond paragraph.')
    expect(body).not.toContain('\n\nHome\n\n')
  })
})
