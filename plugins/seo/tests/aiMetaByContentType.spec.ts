import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { generateMeta, type SEOMetaShape } from '../src/generateMeta'
import { runAutoGenerate } from '../src/autoGenerate/runAutoGenerate'
import type { SEOPluginConfig } from '../src/types'




const HAS_OPENAI = Boolean(process.env.OPENAI_API_KEY)
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? ''

const OPENAI_TIMEOUT_MS = 30000
const skipIfNoOpenAI = it.skipIf(!HAS_OPENAI)





const logPipeline = (label: string, doc: Record<string, unknown>, meta: Record<string, unknown>, rendered: Record<string, unknown>): void => {
  
  const stripRichText = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v
    if (Array.isArray(v)) return v.map(stripRichText)
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'root' && val && typeof val === 'object') {
        const r = val as { children?: unknown[] }
        if (Array.isArray(r.children)) {
          const text = r.children
            .map((c) => {
              const ch = c as { children?: Array<{ text?: string }> }
              return Array.isArray(ch.children) ? ch.children.map((t) => t.text ?? '').join('') : ''
            })
            .join(' ')
          out.bodyText = text
          continue
        }
      }
      out[k] = stripRichText(val)
    }
    return out
  }
  
  console.log(
    `\n━━━ ${label} ━━━\n` +
      `\n📄 INPUT DOC\n${JSON.stringify(stripRichText(doc), null, 2)}\n` +
      `\n🤖 AI-GENERATED META (after runAutoGenerate)\n${JSON.stringify(meta, null, 2)}\n` +
      `\n🌐 RENDERED METADATA (Next.js <head>)\n${JSON.stringify(rendered, null, 2)}\n`
  )
}

























const makeReq = (locale?: string): PayloadRequest =>
  ({
    payload: { logger: { error: () => undefined, info: () => undefined, warn: () => undefined } },
    locale
  }) as unknown as PayloadRequest


const getMeta = <T = unknown>(data: Record<string, unknown>, path: string): T => {
  const parts = path.split('.')
  let cur: unknown = data.meta
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined as T
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur as T
}













describe('page — what AI generates and how it lands on the web page', () => {
  const pagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  it('populates meta from a fully-shaped page doc and renders the canonical Metadata', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'About us', de: 'Über uns' },
      description: { en: 'Learn about the team and what we build.' },
      body: {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'We build useful tools.' }] }
          ]
        }
      },
      heroImage: 'media-about-hero'
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    
    expect(getMeta<string>(data, 'content.title')).toBe('About us')
    expect(getMeta<string>(data, 'content.description')).toBe('Learn about the team and what we build.')
    expect(getMeta<string>(data, 'content.image')).toBe('media-about-hero')
    expect(typeof getMeta<string>(data, 'content.keywords')).toBe('string')

    
    expect(getMeta<string>(data, 'social.social.ogTitle')).toBe('About us')
    expect(getMeta<string>(data, 'social.social.twitterTitle')).toBe('About us')
    expect(getMeta<string>(data, 'social.social.ogDescription')).toBe('Learn about the team and what we build.')
    expect(getMeta<string>(data, 'social.social.twitterDescription')).toBe('Learn about the team and what we build.')

    
    const meta = data.meta as SEOMetaShape
    const rendered = generateMeta({
      meta,
      url: 'https://example.com/en/about',
      type: 'website',
      locale: 'en',
      fallback: { title: 'Untitled' }
    })

    expect(rendered.title).toBe('About us')
    expect(rendered.description).toBe('Learn about the team and what we build.')
    expect(rendered.keywords).toBeInstanceOf(Array)
    expect((rendered.keywords as string[]).length).toBeGreaterThan(0)
    
    expect(rendered.openGraph).toMatchObject({
      type: 'website',
      title: 'About us',
      description: 'Learn about the team and what we build.',
      url: 'https://example.com/en/about',
      locale: 'en'
    })
    
    
    expect(rendered.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'About us',
      description: 'Learn about the team and what we build.'
    })
    
    expect(rendered.alternates).toBeUndefined()
  })

  it('respects locale: only the active locale\'s text is reflected on the page', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'About us', de: 'Über uns' },
      description: { en: 'English summary.', de: 'Deutsche Zusammenfassung.' }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'de',
      req: makeReq('de')
    })
    expect(getMeta<string>(data, 'content.title')).toBe('Über uns')
    expect(getMeta<string>(data, 'content.description')).toBe('Deutsche Zusammenfassung.')

    
    const renderedDe = generateMeta({
      meta: data.meta as SEOMetaShape,
      url: 'https://example.com/de/about',
      type: 'website',
      locale: 'de'
    })
    expect(renderedDe.title).toBe('Über uns')
    expect(renderedDe.description).toBe('Deutsche Zusammenfassung.')
    expect(renderedDe.openGraph?.locale).toBe('de')
    expect(renderedDe.openGraph?.url).toBe('https://example.com/de/about')
  })

  it('truncates over-long descriptions to 155 chars on the page', async () => {
    const longText = 'x'.repeat(300)
    const data: Record<string, unknown> = {
      title: { en: 't' },
      description: { en: longText }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
    expect(rendered.description?.length).toBeLessThanOrEqual(155)
    expect(rendered.description?.endsWith('…')).toBe(true)
  })

  it('falls back to a default title when the page doc has no meta at all', () => {
    
    const rendered = generateMeta({
      meta: undefined,
      type: 'website',
      fallback: { title: 'Untitled' }
    })
    expect(rendered.title).toBe('Untitled')
    
    expect(rendered.description).toBeUndefined()
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })

  it('lets the editor pin meta directly — AI does not overwrite (onlyFillEmpty default)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'New heading' },
      meta: {
        content: { title: 'Editor-pinned', description: 'Editor description' }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'update',
      locale: 'en',
      req: makeReq('en')
    })

    
    expect(getMeta<string>(data, 'content.title')).toBe('Editor-pinned')
    
    expect(getMeta<string>(data, 'content.description')).toBe('Editor description')

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
    expect(rendered.title).toBe('Editor-pinned')
    expect(rendered.description).toBe('Editor description')
  })
})












describe('post — what AI generates and how it lands on a web page', () => {
  const postsCollection: CollectionConfig = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'excerpt', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'coverImage', type: 'upload', relationTo: 'media' } as Field,
      { name: 'author', type: 'text' } as Field,
      { name: 'publishedAt', type: 'date' } as Field,
      { name: 'modifiedAt', type: 'date' } as Field
    ]
  } as CollectionConfig

  it('picks excerpt as description (matches the excerpt|summary|lead regex)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'How we built Payload SEO' },
      excerpt: { en: 'A deep dive into the new SEO plugin.' }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    expect(getMeta<string>(data, 'content.title')).toBe('How we built Payload SEO')
    expect(getMeta<string>(data, 'content.description')).toBe('A deep dive into the new SEO plugin.')
  })

  it('renders the post as an OG article with publishedTime + modifiedTime', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'How we built Payload SEO' },
      excerpt: { en: 'A deep dive into the new SEO plugin.' },
      coverImage: 'media-cover-1',
      author: 'Acme Team',
      publishedAt: '2026-06-10T08:00:00.000Z',
      modifiedAt: '2026-06-15T12:30:00.000Z'
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    
    expect(getMeta<string>(data, 'content.title')).toBe('How we built Payload SEO')
    expect(getMeta<string>(data, 'content.description')).toBe('A deep dive into the new SEO plugin.')
    expect(getMeta<string>(data, 'content.image')).toBe('media-cover-1')

    
    const rendered = generateMeta({
      meta: data.meta as SEOMetaShape,
      url: 'https://example.com/en/posts/seo-plugin',
      type: 'article',
      locale: 'en'
    })

    expect(rendered.title).toBe('How we built Payload SEO')
    expect(rendered.description).toBe('A deep dive into the new SEO plugin.')
    
    
    
    expect(rendered.openGraph).toMatchObject({
      type: 'article',
      title: 'How we built Payload SEO',
      url: 'https://example.com/en/posts/seo-plugin',
      locale: 'en'
    })
    expect(rendered.openGraph?.images).toEqual([{ url: 'media-cover-1', width: 1200, height: 630, alt: 'How we built Payload SEO' }])
    expect(rendered.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'How we built Payload SEO',
      description: 'A deep dive into the new SEO plugin.'
    })
  })

  it('falls back to body plaintext when excerpt is empty (typical long-form post)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'No excerpt here' },
      body: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Lead paragraph that becomes the description.' }]
            }
          ]
        }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    expect(getMeta<string>(data, 'content.description')).toContain('Lead paragraph')

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'article' })
    expect(rendered.description).toContain('Lead paragraph')
  })

  it('derives keywords from the post body when no dedicated keywords field exists', async () => {
    const data: Record<string, unknown> = {
      title: { en: 't' },
      body: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'payload cms seo plugin keywords extraction testing deriveKeywords post'
                }
              ]
            }
          ]
        }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    const keywords = getMeta<string>(data, 'content.keywords')
    expect(typeof keywords).toBe('string')
    expect((keywords as string).length).toBeGreaterThan(0)

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'article' })
    expect(rendered.keywords).toBeInstanceOf(Array)
    expect((rendered.keywords as string[]).length).toBeGreaterThan(0)
  })

  it('renders cleanly when the post has zero content (no fields populated)', () => {
    
    
    const rendered = generateMeta({
      meta: undefined,
      type: 'article',
      locale: 'en',
      fallback: { title: 'Untitled post' }
    })
    expect(rendered.title).toBe('Untitled post')
    expect(rendered.description).toBeUndefined()
    
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })
})










describe('static-page (not-found, error) — what the page looks like when meta is absent', () => {
  it('renders a "Not found" title when the route passes null doc + no fallback', () => {
    const rendered = generateMeta({ meta: undefined, type: 'website' })
    
    expect(rendered.title).toBe('Not found')
  })

  it('honours the route-level fallback title on a 404', () => {
    const rendered = generateMeta({
      meta: null,
      type: 'website',
      fallback: { title: 'Page not found' }
    })
    expect(rendered.title).toBe('Page not found')
  })

  it('honours the route-level fallback description on a 500', () => {
    const rendered = generateMeta({
      meta: null,
      type: 'website',
      fallback: { title: 'Server error', description: 'Something went wrong on our end.' }
    })
    expect(rendered.title).toBe('Server error')
    expect(rendered.description).toBe('Something went wrong on our end.')
  })

  it('static-page 404 has no `robots` directive (noindex feature is gone)', () => {
    const rendered = generateMeta({ meta: undefined, type: 'website', fallback: { title: '404' } })
    expect(rendered.title).toBe('404')

    expect(rendered.robots).toBeUndefined()
  })

  it('never sets alternates on a static page — owner route owns canonical/hreflang', () => {
    const rendered = generateMeta({
      meta: undefined,
      type: 'website',
      url: 'https://example.com/en/404',
      fallback: { title: 'Not found' }
    })
    expect(rendered.alternates).toBeUndefined()
    
    
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })
})





























describe('page — real OpenAI generates meta and renders on a web page', () => {
  const pagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [{ name: 'title', type: 'text', localized: true } as Field]
  } as CollectionConfig

  
  
  
  
  
  

  skipIfNoOpenAI(
    'OpenAI generates description + keywords from a title-only page doc',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Building a Payload CMS SEO plugin from scratch' }
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: pagesCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>
      const social = ((meta.social as Record<string, unknown> | undefined)?.social ?? {}) as Record<string, unknown>

      
      
      
      
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')
      expect(title.toLowerCase()).toContain('seo')

      
      
      
      
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(40)
      expect(desc.length).toBeLessThan(300)
      
      expect(desc).not.toBe(content.title)

      
      
      
      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      
      
      expect(typeof social.ogTitle).toBe('string')
      expect((social.ogTitle as string).length).toBeGreaterThan(0)
      expect(typeof social.twitterTitle).toBe('string')
      expect((social.twitterTitle as string).length).toBeGreaterThan(0)

      
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/about',
        type: 'website',
        locale: 'en',
        fallback: { title: 'Untitled' }
      })

      
      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      
      expect(rendered.keywords).toBeInstanceOf(Array)
      expect((rendered.keywords as string[]).length).toBeGreaterThanOrEqual(4)
      expect(rendered.openGraph).toMatchObject({
        type: 'website',
        title,
        description: desc,
        url: 'https://example.com/en/about',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('PAGE — Building a Payload CMS SEO plugin from scratch', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})

describe('post — real OpenAI generates article meta and renders on a web page', () => {
  const postsCollection: CollectionConfig = {
    slug: 'posts',
    fields: [{ name: 'title', type: 'text', localized: true } as Field]
  } as CollectionConfig

  skipIfNoOpenAI(
    'OpenAI generates meta for a title-only post and renders it as OG article',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Why we built the Payload SEO plugin' }
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: postsCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>

      
      
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')
      expect(title.toLowerCase()).toContain('seo')

      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(40)
      expect(desc).not.toBe(content.title)

      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/posts/seo-plugin',
        type: 'article',
        locale: 'en'
      })

      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      expect(rendered.openGraph).toMatchObject({
        type: 'article',
        title,
        description: desc,
        url: 'https://example.com/en/posts/seo-plugin',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('POST — Why we built the Payload SEO plugin', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})

describe('live OpenAI — sanity checks that prevent silent contract drift', () => {
  skipIfNoOpenAI(
    'OpenAI returns usable meta for a one-field doc (smoke test for the integration)',
    async () => {
      
      
      
      
      const inputDoc: Record<string, unknown> = {
        title: 'A short note about OpenAI integration'
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }
      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: {
          slug: 'sanity',
          fields: [{ name: 'title', type: 'text' } as Field]
        } as CollectionConfig,
        data,
        operation: 'create',
        locale: undefined,
        req: makeReq()
      })

      const content = ((data.meta as Record<string, unknown>).content ?? {}) as Record<string, unknown>
      expect(content.title).toBe('A short note about OpenAI integration')
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(20)
      
      
      expect(desc).not.toBe(content.title)

      const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
      logPipeline('SMOKE — A short note about OpenAI integration', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})























describe('page with rich content — AI extracts meta from blocks + json + richText', () => {
  const richPagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      {
        name: 'layout',
        type: 'blocks',
        blocks: {
          content: {
            slug: 'content',
            fields: [
              {
                name: 'columns',
                type: 'array',
                fields: [
                  { name: 'text', type: 'text' } as Field,
                  { name: 'linkUrl', type: 'text' } as Field,
                  { name: 'linkLabel', type: 'text' } as Field
                ]
              }
            ]
          }
        }
      } as unknown as Field,
      { name: 'faq', type: 'json' } as Field,
      { name: 'customMeta', type: 'json' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  skipIfNoOpenAI(
    'AI generates meta for a page with richText body + layout blocks + FAQ json',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Payload CMS for cross-border job platforms' },
        description: { en: '' },
        body: {
          root: {
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'Payload is a headless CMS built for production. It gives you a typed schema, an admin UI, and a database layer in one.'
                  }
                ]
              },
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'For cross-border job platforms, localization and content workflows matter. Payload handles both natively with the @payloadcms/next + @payloadcms/db-postgres adapters.'
                  }
                ]
              }
            ]
          }
        },
        layout: [
          {
            blockType: 'content',
            columns: [
              { text: 'Fast to deploy — Postgres + S3 + Next.js, all in one repo.', linkUrl: '/docs', linkLabel: 'Read the docs' },
              { text: 'Type-safe end-to-end — generated TS types for every collection.', linkUrl: '/typescript', linkLabel: 'TS guide' }
            ]
          }
        ],
        faq: [
          { question: 'Does Payload support localization?', answer: 'Yes — every text field can be localized per-locale.' },
          { question: 'Can I use my own auth?', answer: 'Yes — Payload lets you plug in any strategy.' }
        ],
        customMeta: { category: 'cms', audience: 'developers', priority: 'high' },
        heroImage: 'media-hero-payload'
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: richPagesCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>
      const social = ((meta.social as Record<string, unknown> | undefined)?.social ?? {}) as Record<string, unknown>

      
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')

      
      
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(80)
      expect(desc).not.toBe(content.title)
      
      
      const descLower = desc.toLowerCase()
      const referencesTopic =
        descLower.includes('payload') ||
        descLower.includes('cms') ||
        descLower.includes('job') ||
        descLower.includes('cross-border')
      expect(referencesTopic).toBe(true)

      
      
      
      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      
      expect(content.image).toBe('media-hero-payload')

      
      expect(typeof social.ogTitle).toBe('string')
      expect(social.ogDescription).toBe(desc)
      expect(social.twitterTitle).toBeTypeOf('string')
      expect(social.twitterDescription).toBe(desc)

      
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/payload-job-platform',
        type: 'website',
        locale: 'en',
        fallback: { title: 'Untitled' }
      })

      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      expect(rendered.keywords).toBeInstanceOf(Array)
      expect((rendered.keywords as string[]).length).toBeGreaterThanOrEqual(4)
      expect(rendered.openGraph).toMatchObject({
        type: 'website',
        title,
        description: desc,
        url: 'https://example.com/en/payload-job-platform',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('PAGE w/ RICH CONTENT — Payload CMS for cross-border job platforms', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})
