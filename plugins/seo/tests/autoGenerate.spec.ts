import { describe, expect, it } from 'vitest'

import { extractScalars, lexicalToPlainText } from '../src/autoGenerate/extractScalars'
import { runAutoGenerate } from '../src/autoGenerate/runAutoGenerate'
import type { CollectionConfig, Field, PayloadRequest } from 'payload'
import type { SEOPluginConfig } from '../src/types'

// Minimal PayloadRequest stub — runAutoGenerate reads `req.payload.logger`
// and `req.locale` only.
const makeReq = (locale?: string): PayloadRequest =>
  ({
    payload: { logger: { error: () => undefined, info: () => undefined, warn: () => undefined } },
    locale
  }) as unknown as PayloadRequest

// ---------- lexicalToPlainText ----------

describe('lexicalToPlainText', () => {
  it('flattens a simple Lexical paragraph', () => {
    const node = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello world' }]
          }
        ]
      }
    }
    expect(lexicalToPlainText(node)).toBe('Hello world')
  })

  it('walks nested children (lists, headings, quotes)', () => {
    const node = {
      root: {
        children: [
          { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Title' }] },
          { type: 'list', children: [{ type: 'listitem', children: [{ type: 'text', text: 'one' }] }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'two' }] }
        ]
      }
    }
    expect(lexicalToPlainText(node)).toBe('Title one two')
  })

  it('handles empty / malformed input gracefully', () => {
    expect(lexicalToPlainText(null)).toBe('')
    expect(lexicalToPlainText(undefined)).toBe('')
    expect(lexicalToPlainText({})).toBe('')
    expect(lexicalToPlainText({ root: null })).toBe('')
  })

  it('walks inline blocks with `fields.richText`', () => {
    const node = {
      root: {
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'richTextInCol',
              richText: {
                root: {
                  children: [
                    { type: 'paragraph', children: [{ type: 'text', text: 'inside col' }] }
                  ]
                }
              }
            }
          }
        ]
      }
    }
    expect(lexicalToPlainText(node)).toContain('inside col')
  })
})

// ---------- extractScalars ----------

describe('extractScalars', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field,
      { name: 'slug', type: 'text' } as Field,
      { name: 'count', type: 'number' } as Field
    ]
  } as CollectionConfig

  it('extracts a localized text field for the active locale', () => {
    const doc = { title: { en: 'Hello', de: 'Hallo' }, description: { en: 'World' } }
    const out = extractScalars({ doc, collectionConfig: collection, locale: 'de' })
    expect(out.scalarsByName.title).toBe('Hallo')
    expect(out.scalarsByName.description).toBe('World')
  })

  it('falls back to first non-empty locale when active locale is missing', () => {
    const doc = { title: { de: 'Hallo' } }
    const out = extractScalars({ doc, collectionConfig: collection, locale: 'en' })
    expect(out.scalarsByName.title).toBe('Hallo')
  })

  it('flattens richText to plaintext in allPlainText', () => {
    const doc = {
      body: {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'First paragraph.' }] },
            { type: 'paragraph', children: [{ type: 'text', text: 'Second.' }] }
          ]
        }
      }
    }
    const out = extractScalars({ doc, collectionConfig: collection, locale: undefined })
    expect(out.allPlainText).toContain('First paragraph')
    expect(out.allPlainText).toContain('Second')
    expect((out.scalarsByName.body as { __lexical?: string }).__lexical).toContain('First paragraph')
  })

  it('picks up image relations by name', () => {
    const doc = { heroImage: 'media-abc-123' }
    const out = extractScalars({ doc, collectionConfig: collection, locale: undefined })
    expect(out.firstImageId).toBe('media-abc-123')
    expect((out.scalarsByName.heroImage as { __relation?: string }).__relation).toBe('media-abc-123')
  })

  it('skips text fields that are empty', () => {
    const doc = { title: '' }
    const out = extractScalars({ doc, collectionConfig: collection, locale: undefined })
    expect(out.scalarsByName.title).toBeUndefined()
    expect(out.allPlainText).toBe('')
  })

  it('walks the first item of an array field (lead content)', () => {
    const collectionWithArray: CollectionConfig = {
      slug: 'pages',
      fields: [
        { name: 'items', type: 'array', fields: [
          { name: 'heading', type: 'text' } as Field
        ] as Field[] } as Field
      ]
    } as CollectionConfig
    const doc = { items: [{ heading: 'first' }, { heading: 'second' }] }
    const out = extractScalars({ doc, collectionConfig: collectionWithArray, locale: undefined })
    expect(out.scalarsByName.heading).toBe('first')
  })
})

// ---------- runAutoGenerate: heuristic mode ----------

describe('runAutoGenerate — heuristic mode (allScalars)', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  it('fills meta.title from the title field', async () => {
    const data: Record<string, unknown> = { title: { en: 'My page' } }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    expect((data.meta as Record<string, unknown>).content).toMatchObject({
      title: 'My page'
    })
  })

  it('fills meta.description from the description field (truncated at 155)', async () => {
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
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const description = ((data.meta as Record<string, unknown>).content as Record<string, unknown>).description as string
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description.endsWith('…')).toBe(true)
  })

  it('fills meta.image from the heroImage field', async () => {
    const data: Record<string, unknown> = {
      title: { en: 't' },
      heroImage: 'media-xyz-789'
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.image).toBe('media-xyz-789')
  })

  it('mirrors title into ogTitle and twitterTitle when those are empty', async () => {
    const data: Record<string, unknown> = { title: { en: 'My page' } }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const social = (data.meta as Record<string, unknown>).social as Record<string, unknown>
    const innerSocial = social.social as Record<string, unknown>
    expect(innerSocial.ogTitle).toBe('My page')
    expect(innerSocial.twitterTitle).toBe('My page')
  })

  it('derives keywords from the richText body', async () => {
    const data: Record<string, unknown> = {
      title: { en: 't' },
      body: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'payload cms seo plugin keywords extraction testing' }
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
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(typeof content.keywords).toBe('string')
    expect((content.keywords as string).length).toBeGreaterThan(0)
  })
})

// ---------- runAutoGenerate: onlyFillEmpty ----------

describe('runAutoGenerate — onlyFillEmpty', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [{ name: 'title', type: 'text' } as Field]
  } as CollectionConfig

  it('preserves editor-set meta.title when onlyFillEmpty is true (default)', async () => {
    const data: Record<string, unknown> = {
      title: 'NEW',
      meta: { content: { title: 'editor-set' } }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'update',
      locale: undefined,
      req: makeReq()
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('editor-set')
  })

  it('overwrites editor-set meta when onlyFillEmpty is false', async () => {
    const data: Record<string, unknown> = {
      title: 'NEW',
      meta: { content: { title: 'editor-set' } }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars', onlyFillEmpty: false }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'update',
      locale: undefined,
      req: makeReq()
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('NEW')
  })
})

// ---------- runAutoGenerate: explicit deriveFrom ----------

describe('runAutoGenerate — explicit deriveFrom mapping', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'pageTitle', type: 'text', localized: true } as Field,
      { name: 'pageSummary', type: 'textarea', localized: true } as Field,
      { name: 'pageHero', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  it('maps slot → source field by name', async () => {
    const data: Record<string, unknown> = {
      pageTitle: { en: 'My page' },
      pageSummary: { en: 'A summary' },
      pageHero: 'media-id-1'
    }
    const config: SEOPluginConfig = {
      autoGenerate: {
        mode: 'onCreateOrUpdate',
        deriveFrom: { title: 'pageTitle', description: 'pageSummary', image: 'pageHero' }
      }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('My page')
    expect(content.description).toBe('A summary')
    expect(content.image).toBe('media-id-1')
  })

  it('skips empty source fields silently', async () => {
    const data: Record<string, unknown> = {
      pageTitle: { en: 'My page' },
      pageSummary: { en: '' }
    }
    const config: SEOPluginConfig = {
      autoGenerate: {
        mode: 'onCreateOrUpdate',
        deriveFrom: { title: 'pageTitle', description: 'pageSummary' }
      }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('My page')
    expect(content.description).toBeUndefined()
  })
})

// ---------- runAutoGenerate: mode gating ----------

describe('runAutoGenerate — mode gating', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [{ name: 'title', type: 'text' } as Field]
  } as CollectionConfig

  it('does nothing when mode is off', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'off', deriveFrom: 'allScalars' }
    }
    const result = await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    expect(result.meta).toBeUndefined()
  })

  it('does nothing when mode is onCreate and operation is update', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreate', deriveFrom: 'allScalars' }
    }
    const result = await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'update',
      locale: undefined,
      req: makeReq()
    })
    expect(result.meta).toBeUndefined()
  })

  it('does nothing when autoGenerate is explicitly false', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = { autoGenerate: false }
    const result = await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    expect(result.meta).toBeUndefined()
  })

  it('does nothing when autoGenerate is omitted entirely', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = {}
    const result = await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    expect(result.meta).toBeUndefined()
  })
})

// ---------- runAutoGenerate: generator fallback ----------

describe('runAutoGenerate — generator pass', () => {
  const collection: CollectionConfig = {
    slug: 'pages',
    fields: [{ name: 'title', type: 'text' } as Field]
  } as CollectionConfig

  it('fills still-empty slots from a user-provided generateSEO function', async () => {
    const data: Record<string, unknown> = { title: 't', meta: { content: { title: '' } } }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' },
      generateSEO: () => ({ keywords: 'kw1, kw2' })
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('t')
    expect(content.keywords).toBe('kw1, kw2')
  })

  it('does not throw when the generator throws — heuristic result is kept', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' },
      generateSEO: () => {
        throw new Error('LLM down')
      }
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('t')
  })

  it('does not throw when the generator times out — heuristic result is kept', async () => {
    const data: Record<string, unknown> = { title: 't' }
    const config: SEOPluginConfig = {
      autoGenerate: {
        mode: 'onCreateOrUpdate',
        deriveFrom: 'allScalars',
        timeoutMs: 50
      },
      generateSEO: () => new Promise<{ title: string }>((r) => setTimeout(() => r({ title: 'late' }), 500))
    }
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: collection,
      data,
      operation: 'create',
      locale: undefined,
      req: makeReq()
    })
    const content = (data.meta as Record<string, unknown>).content as Record<string, unknown>
    expect(content.title).toBe('t')
  })
})
