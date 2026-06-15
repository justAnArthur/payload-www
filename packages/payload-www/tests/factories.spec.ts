import { describe, expect, it } from 'vitest'

import { createWWWConfig } from '../src/config/createWWWConfig'
import {
  createPagesCollection,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  pageSlugNestedDivider
} from '../src/data/collections'
import { createHeaderGlobal } from '../src/data/collections/globals/Header/config'
import { createFooterGlobal } from '../src/data/collections/globals/Footer/config'
import { createLayoutExports } from '../src/render/pages/createLayoutExports'
import { addCollectionsToSitemap } from '../src/render/pages/createCollectionPageExports'

const i18n = { defaultLocale: 'en', locales: ['en', 'uk'] as const }
const footerBlocks = [{ slug: 'cta', fields: [] }] as any

describe('createWWWConfig', () => {
  it('returns the full public API surface', () => {
    const api = createWWWConfig({ i18n, blocks: [] })
    const expected = [
      'withWWWConfig',
      'createPagesCollection',
      'createHeaderGlobal',
      'createFooterGlobal',
      'createLayoutExports',
      'createCollectionPageExports',
      'addCollectionsToSitemap',
      'RenderBlocks',
      'LivePreviewListener',
      'getFromImportMap',
      'generateImportName',
      'renderCollectionModule'
    ]
    for (const k of expected) {
      expect(Object.keys(api)).toContain(k)
    }
  })
})

describe('createPagesCollection', () => {
  it('returns a Pages collection with localized title and blocks', () => {
    const blocks = [{ slug: 'cta', fields: [] }] as any
    const pages = createPagesCollection(blocks) as any
    expect(pages.slug).toBe('pages')
    expect(pages.access.read({ req: { user: null } } as never)).toEqual({ _status: { equals: 'published' } })
    expect(pages.access.read({ req: { user: { id: 1 } } } as never)).toBe(true)
    const titleField = pages.fields.find((f: any) => f.name === 'title')
    expect(titleField.localized).toBe(true)
    expect(titleField.required).toBe(true)
    expect(pages.versions.drafts).toBeTruthy()
  })

  it('passes through seoFields when provided', () => {
    const seoFields = [{ name: 'metaTitle', type: 'text' }]
    const pages = createPagesCollection([], { seoFields: seoFields as any }) as any
    const seoTab = pages.fields
      .find((f: any) => f.type === 'tabs')
      .tabs.find((t: any) => t.label === 'SEO')
    expect(seoTab).toBeDefined()
    expect(seoTab.fields.length).toBe(1)
  })

  it('omits the SEO tab when seoFields is empty (the default)', () => {
    const pages = createPagesCollection([]) as any
    const tabs = pages.fields.find((f: any) => f.type === 'tabs').tabs
    const labels = tabs.map((t: any) => t.label)
    expect(labels).toEqual(['Content'])
  })

  it('uses HOME_PAGE_SLUG and pageSlugNestedDivider for the revalidation path', () => {
    expect(HOME_PAGE_SLUG).toBe('')
    expect(pageSlugNestedDivider).toBe('_')
    expect(PAGES_SLUG).toBe('pages')
  })

  it('attaches renderPath as custom.path', () => {
    const pages = createPagesCollection([], { renderPath: '@/render/pages' }) as any
    expect(pages.custom).toEqual({ path: '@/render/pages' })
  })
})

describe('createHeaderGlobal', () => {
  it('returns a Header global with nav blocks (navColumn + navItem)', () => {
    const header = createHeaderGlobal() as any
    expect(header.slug).toBe('header')
    expect(header.access.read()).toBe(true)
    const nav = header.fields.find((f: any) => f.name === 'nav')
    expect(nav.type).toBe('blocks')
    const slugs = nav.blocks.map((b: any) => b.slug)
    expect(slugs).toContain('navColumn')
    expect(slugs).toContain('navItem')
  })

  it('attaches renderPath as custom.path', () => {
    const header = createHeaderGlobal({ renderPath: '@/render/header' }) as any
    expect(header.custom).toEqual({ path: '@/render/header' })
  })
})

describe('createFooterGlobal', () => {
  it('returns a Footer global with blocks/nav/socials', () => {
    const footer = createFooterGlobal({ blocks: footerBlocks }) as any
    expect(footer.slug).toBe('footer')
    const blocks = footer.fields.find((f: any) => f.name === 'blocks')
    const nav = footer.fields.find((f: any) => f.name === 'nav')
    const socials = footer.fields.find((f: any) => f.name === 'socials')
    expect(blocks.type).toBe('blocks')
    expect(nav.type).toBe('array')
    expect(socials.type).toBe('array')
  })
})

describe('addCollectionsToSitemap', () => {
  it('combines sitemaps from multiple exports', async () => {
    const a = {
      default: async () => [{ url: 'a' }] as any,
      generateSitemap: async () => [{ url: 'a' }] as any
    }
    const b = {
      default: async () => [{ url: 'b' }, { url: 'c' }] as any,
      generateSitemap: async () => [{ url: 'b' }, { url: 'c' }] as any
    }
    const combined = addCollectionsToSitemap([a, b])
    const result = await combined.generateSitemap()
    expect(result).toEqual([{ url: 'a' }, { url: 'b' }, { url: 'c' }])
  })
})

describe('createLayoutExports', () => {
  it('returns an object with a default Layout component', () => {
    const configPromise = Promise.resolve({ collections: [], globals: [] } as any)
    const importMap = {} as any
    const result = createLayoutExports(
      { config: configPromise, importMap },
      {
        hasLocale: (() => true) as never, setRequestLocale: () => {
        }, routing: { locales: ['en'] }
      }
    )
    expect(typeof result.default).toBe('function')
  })
})

describe('generatePreviewPath', () => {
  it('returns null for missing slug', () => {
    expect(generatePreviewPath({ slug: undefined, collection: 'pages' })).toBeNull()
    expect(generatePreviewPath({ slug: null, collection: 'pages' })).toBeNull()
  })
  it('builds the preview path with the slug and secret', () => {
    const p = generatePreviewPath({ slug: 'about', collection: 'pages' })
    expect(p).toContain('path=%2Fabout') // URL-encoded
    expect(p).toContain('previewSecret=')
  })
})
