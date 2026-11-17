import { describe, expect, it, vi } from 'vitest'
import type { Field, SanitizedConfig } from 'payload'

vi.mock('../src/render/metadata/query', () => ({ queryGlobal: vi.fn(async () => null) }))

import { buildLlmsDocument } from '../src/render/llms/createLlmsTxt'
import { createMarkdownFromCollections, type MarkdownSource, renderMarkdownPage } from '../src/render/llms/createMarkdownPages'
import { fieldsToMarkdown, lexicalToPlainText, type RichTextToMarkdown } from '../src/render/llms/fieldsToMarkdown'
import { createLinkResolver } from '../src/render/llms/linkResolver'
import { renderLlmsFullTxt } from '../src/render/llms/renderLlmsTxt'

const siteUrl = 'https://www.example.com'
const routing = { locales: ['en', 'sk'], defaultLocale: 'en', localePrefix: 'as-needed' }

// the shape link() builds: rows around type/reference/url/label
const linkField = {
  name: 'link',
  type: 'group',
  fields: [
    { type: 'row', fields: [{ name: 'type', type: 'radio' }, { name: 'newTab', type: 'checkbox' }] },
    { type: 'row', fields: [{ name: 'reference', type: 'relationship' }, { name: 'url', type: 'text' }, { name: 'label', type: 'text' }] }
  ]
}
const heroBlock = {
  slug: 'hero',
  fields: [{ name: 'heading', type: 'text' }, { name: 'body', type: 'richText' }, { name: 'links', type: 'array', fields: [linkField] }]
}
const pagesFields = [
  { name: 'title', type: 'text' },
  { name: 'layout', type: 'blocks', blocks: [heroBlock] },
  { name: 'slug', type: 'text' }
] as unknown as Field[]

const config = {
  collections: [
    { slug: 'pages', admin: { useAsTitle: 'title' }, fields: pagesFields },
    { slug: 'posts', admin: { useAsTitle: 'title' }, fields: [{ name: 'title', type: 'text' }, { name: 'content', type: 'richText' }] }
  ],
  globals: [],
  blocks: []
} as unknown as SanitizedConfig

const richTextToMarkdown: RichTextToMarkdown = ({ data }) => lexicalToPlainText(data)
const heading = (tag: string, text: string) => ({ root: { type: 'root', children: [{ type: 'heading', tag, children: [{ type: 'text', text }] }] } })

type Doc = Record<string, any>
const home: Doc = {
  id: 1, slug: '', title: 'Home',
  layout: [{
    blockType: 'hero',
    heading: 'Rent smarter',
    links: [
      { link: { type: 'custom', url: '/demo', label: 'Book a demo' } },
      { link: { type: 'reference', reference: { relationTo: 'pages', value: { id: 2, slug: 'about' } }, label: 'About us' } },
      { link: { type: 'reference', reference: { relationTo: 'posts', value: 10 }, label: 'Our [first] post' } },
      { link: { type: 'custom', url: '#pricing', label: 'Jump down' } }
    ]
  }]
}
const about: Doc = { id: 2, slug: 'about', title: 'About', layout: [] }
const post: Doc = { id: 10, slug: 'hello', title: 'Hello', content: heading('h2', 'Hello world') }

const entry = (doc: Doc, path: string) => ({ doc, url: siteUrl + path, alternates: { canonical: siteUrl + path, languages: {} }, lastModified: '' })

const source = (collectionSlug: string, byPath: Record<string, Doc>, pathPrefix?: string): MarkdownSource => ({
  collectionSlug,
  pathPrefix,
  payloadConfig: Promise.resolve(config),
  getRouting: async () => routing,
  getServerSideURL: () => siteUrl,
  listDocs: async () => Object.entries(byPath).map(([path, doc]) => entry(doc, path === '/' ? '' : path)),
  findDoc: async pathname => {
    const key = pathname.replace(/\/+$/, '') || '/'
    return byPath[key] ? entry(byPath[key], key === '/' ? '' : key) : null
  }
})

const pages = source('pages', { '/': home, '/about': about })
const posts = source('posts', { '/posts/hello': post }, 'posts')
const sources = [pages, posts]

describe('link groups', () => {
  const resolveLink = createLinkResolver({
    siteUrl, locale: 'en', routing: routing as never, pathPrefixes: { posts: 'posts' },
    urlsById: new Map([['posts:10', `${siteUrl}/posts/hello`]])
  })
  const markdown = (withResolver: boolean) => fieldsToMarkdown({
    fields: pagesFields, data: home, richTextToMarkdown, resolveLink: withResolver ? resolveLink : undefined
  })

  it('prints [label](url) for custom, populated and id-only references', () => {
    const output = markdown(true)
    expect(output).toContain(`[Book a demo](${siteUrl}/demo)`)
    expect(output).toContain(`[About us](${siteUrl}/about)`)
    expect(output).toContain(`[Our \\[first\\] post](${siteUrl}/posts/hello)`)
  })

  it('prints the label alone for in-page anchors and without a resolver', () => {
    expect(markdown(true)).toMatch(/^Jump down$/m)
    expect(markdown(false)).toMatch(/^Book a demo$/m)
    expect(markdown(false)).not.toContain('](')
  })

  it('prefixes internal links with the locale', () => {
    const sk = createLinkResolver({ siteUrl, locale: 'sk', routing: routing as never, pathPrefixes: {} })
    expect(sk({ type: 'reference', reference: { relationTo: 'pages', value: { id: 2, slug: 'o-nas' } } })).toBe(`${siteUrl}/sk/o-nas`)
    expect(sk({ type: 'custom', url: 'mailto:sales@example.com' })).toBe('mailto:sales@example.com')
    expect(sk({ type: 'custom', url: '//evil.example' })).toBeUndefined()
  })
})

describe('markdown: false', () => {
  it('leaves out marked fields and blocks', () => {
    const fields = [{
      name: 'layout', type: 'blocks', blocks: [
        { slug: 'card', fields: [{ name: 'label', type: 'text' }, { name: 'icon', type: 'text', custom: { '@justanarthur/payload-www': { markdown: false } } }] },
        { slug: 'window', custom: { '@justanarthur/payload-www': { markdown: false } }, fields: [{ name: 'toolbar', type: 'text' }] }
      ]
    }] as unknown as Field[]
    const data = { layout: [{ blockType: 'card', label: 'Fleet', icon: 'CarFront' }, { blockType: 'window', toolbar: 'camasys.com' }] }
    expect(fieldsToMarkdown({ fields, data, richTextToMarkdown })).toBe('Fleet')
  })
})

describe('llms-full.txt links', () => {
  it('resolves id-only references through the listing', async () => {
    const full = renderLlmsFullTxt(await buildLlmsDocument(sources, { richTextToMarkdown, globalSlug: false }, true))
    expect(full).toContain(`[Our \\[first\\] post](${siteUrl}/posts/hello)`)
  })
})

describe('renderMarkdownPage', () => {
  it('renders the page content, adding the title when the page has no h1', async () => {
    const page = await renderMarkdownPage(sources, '/', { richTextToMarkdown, append: 'More: /llms.txt' })
    expect(page?.url).toBe(siteUrl)
    expect(page?.body.startsWith('# Home\n\nRent smarter\n\n')).toBe(true)
    expect(page?.body).toContain(`[Book a demo](${siteUrl}/demo)`)
    expect(page?.body.endsWith('More: /llms.txt\n')).toBe(true)
  })

  it('keeps an h1 of its own and finds documents in later collections', async () => {
    const withH1 = source('posts', { '/posts/hello': { ...post, content: heading('h1', 'Hello world') } }, 'posts')
    const page = await renderMarkdownPage([pages, withH1], '/posts/hello', {
      richTextToMarkdown: ({ data }) => '# ' + lexicalToPlainText(data)
    })
    expect(page?.body).toBe('# Hello world\n')
  })

  it('answers excluded and unknown paths with null', async () => {
    expect(await renderMarkdownPage(sources, '/about', { richTextToMarkdown, exclude: [`${siteUrl}/about`] })).toBeNull()
    expect(await renderMarkdownPage(sources, '/missing', { richTextToMarkdown })).toBeNull()
  })
})

describe('createMarkdownFromCollections', () => {
  const get = (path: string[] | undefined, options = {}) =>
    createMarkdownFromCollections(sources, { richTextToMarkdown, ...options })(new Request(siteUrl), { params: Promise.resolve({ path }) })

  it('serves a page as text/markdown with Vary: Accept and its canonical URL', async () => {
    const response = await get(undefined)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(response.headers.get('vary')).toBe('Accept')
    expect(response.headers.get('link')).toBe(`<${siteUrl}>; rel="canonical"`)
    expect(await response.text()).toContain('Rent smarter')
  })

  it('answers a missing page with a Markdown 404', async () => {
    const response = await get(['nope'])
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(response.headers.get('vary')).toBe('Accept')
    expect(await response.text()).toBe(`# Page not found\n\nThis page does not exist on example.com.\n\n- Site overview for assistants: ${siteUrl}/llms.txt\n- Sitemap: ${siteUrl}/sitemap.xml\n`)
  })

  it('takes a custom 404 body', async () => {
    const response = await get(['nope'], { notFound: (path: string) => `# Gone: ${path}` })
    expect(await response.text()).toBe('# Gone: /nope\n')
  })
})
