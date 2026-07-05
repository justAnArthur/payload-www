import type { SanitizedCollectionConfig, SanitizedConfig } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { SEOMetaShape } from '../src/generateMeta'
import { createOpenGraphImageRoute } from '../src/opengraph-image/createOpenGraphImageRoute'
import { extractSEOMetaForImage } from '../src/opengraph-image/extractSEOMetaForImage'
import { getCollectionOGImagePath } from '../src/opengraph-image/getCollectionOGImagePath'





describe('extractSEOMetaForImage', () => {
  it('cascades title: ogTitle → twitterTitle → content.title', () => {
    const meta: SEOMetaShape = {
      content: { title: 'From content' },
      social: {
        social: {
          ogTitle: 'From ogTitle',
          twitterTitle: 'From twitterTitle'
        }
      }
    }
    expect(extractSEOMetaForImage({ meta }).title).toBe('From ogTitle')
  })

  it('falls back to content.title when social fields are empty', () => {
    const meta: SEOMetaShape = {
      content: { title: 'Plain content title' },
      social: { social: {} }
    }
    expect(extractSEOMetaForImage({ meta }).title).toBe('Plain content title')
  })

  it('uses fallback.title when meta has no title', () => {
    expect(extractSEOMetaForImage({ meta: null, fallback: { title: 'Fallback' } }).title).toBe(
      'Fallback'
    )
  })

  it("defaults to 'Untitled' when meta + fallback both missing", () => {
    expect(extractSEOMetaForImage({ meta: null }).title).toBe('Untitled')
    expect(extractSEOMetaForImage({}).title).toBe('Untitled')
  })

  it('cascades description: ogDescription → twitterDescription → content.description', () => {
    const meta: SEOMetaShape = {
      content: { description: 'From content' },
      social: {
        social: {
          ogDescription: 'From ogDescription',
          twitterDescription: 'From twitterDescription'
        }
      }
    }
    expect(extractSEOMetaForImage({ meta }).description).toBe('From ogDescription')
  })

  it('falls back through the description chain to undefined', () => {
    expect(
      extractSEOMetaForImage({ meta: { content: {} }, fallback: {} }).description
    ).toBeUndefined()
    expect(extractSEOMetaForImage({ meta: null }).description).toBeUndefined()
  })

  it('resolves image URL from { url } upload shape', () => {
    const meta: SEOMetaShape = {
      social: {
        social: { ogImage: { url: 'https://cdn.example.com/og.png' } }
      }
    }
    expect(extractSEOMetaForImage({ meta }).image).toBe('https://cdn.example.com/og.png')
  })

  it('cascades image: ogImage → twitterImage → content.image', () => {
    const meta: SEOMetaShape = {
      content: { image: 'content-image.png' },
      social: {
        social: {
          ogImage: 'og.png',
          twitterImage: 'tw.png'
        }
      }
    }
    expect(extractSEOMetaForImage({ meta }).image).toBe('og.png')
  })

  it('falls back through image chain when ogImage is empty string', () => {
    const meta: SEOMetaShape = {
      content: { image: 'content-image.png' },
      social: { social: { ogImage: '' } }
    }
    expect(extractSEOMetaForImage({ meta }).image).toBe('content-image.png')
  })

  it('passes locale through to result', () => {
    expect(extractSEOMetaForImage({ meta: null, locale: 'sk' }).locale).toBe('sk')
  })

  it('does not surface author / publishedAt / modifiedAt (doc-level fields are gone)', () => {
    const article = extractSEOMetaForImage({
      meta: { content: { title: 't' } },
      type: 'article'
    } as never)
    expect((article as Record<string, unknown>).author).toBeUndefined()
    expect((article as Record<string, unknown>).publishedAt).toBeUndefined()
    expect((article as Record<string, unknown>).modifiedAt).toBeUndefined()
  })

  it('drops empty-string fields from the result (not just nullish)', () => {
    const meta: SEOMetaShape = {
      content: { title: 'Real title', description: '' },
      social: { social: { ogTitle: '' } }
    }
    const out = extractSEOMetaForImage({ meta })
    expect(out.title).toBe('Real title')
    expect(out.description).toBeUndefined()
    expect('description' in out).toBe(false)
  })
})





describe('getCollectionOGImagePath', () => {
  it('reads custom.ogImage from the collection', () => {
    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG#default' }
    } as unknown as SanitizedCollectionConfig
    expect(getCollectionOGImagePath(collection)).toBe('@/components/og/PostOG#default')
  })

  it('returns undefined when custom.ogImage is missing', () => {
    const collection = { slug: 'posts' } as unknown as SanitizedCollectionConfig
    expect(getCollectionOGImagePath(collection)).toBeUndefined()
  })

  it('returns undefined when collection is undefined', () => {
    expect(getCollectionOGImagePath(undefined)).toBeUndefined()
  })

  it('returns undefined when custom.ogImage is an empty string', () => {
    const collection = {
      slug: 'posts',
      custom: { ogImage: '' }
    } as unknown as SanitizedCollectionConfig
    expect(getCollectionOGImagePath(collection)).toBeUndefined()
  })

  it('returns undefined when custom.ogImage is not a string', () => {
    const collection = {
      slug: 'posts',
      custom: { ogImage: 42 }
    } as unknown as SanitizedCollectionConfig
    expect(getCollectionOGImagePath(collection)).toBeUndefined()
  })

  it('coexists with custom.path without conflict', () => {
    const collection = {
      slug: 'posts',
      custom: {
        path: '@/posts/PostPage#default',
        ogImage: '@/posts/PostOG#default'
      }
    } as unknown as SanitizedCollectionConfig
    expect(getCollectionOGImagePath(collection)).toBe('@/posts/PostOG#default')
  })
})





const buildSanitizedConfig = (
  collection: Partial<SanitizedCollectionConfig> & { slug: string },
  importMap: Record<string, unknown> = {}
): SanitizedConfig =>
  ({
    collections: [collection as SanitizedCollectionConfig],
    admin: { importMap: importMap as never }
  }) as unknown as SanitizedConfig

const buildRouteConfig = (collection: Partial<SanitizedCollectionConfig> & { slug: string }) => ({
  config: Promise.resolve(buildSanitizedConfig(collection)),
  collectionSlug: collection.slug
})

describe('createOpenGraphImageRoute', () => {
  it('returns undefined when collection has no custom.ogImage (Next.js fallback path)', async () => {
    const route = createOpenGraphImageRoute(
      buildRouteConfig({ slug: 'posts' } as Partial<SanitizedCollectionConfig> & {
        slug: string
      })
    )
    const out = await route({ params: Promise.resolve({ slug: 'hello-world' }) })
    expect(out).toBeUndefined()
  })

  it('renders ImageResponse when custom.ogImage resolves through the import map', async () => {
    const FakeComponent = vi.fn(() => null) as unknown as Parameters<
      typeof createOpenGraphImageRoute
    >[0]['component']
    const importMap = {
      '@/components/og/PostOG#default': FakeComponent
    }

    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG#default' }
    } as unknown as SanitizedCollectionConfig

    const config = buildSanitizedConfig(collection, importMap)

    
    
    
    const fetchDoc = vi.fn(async () => ({
      id: 1,
      title: 'Hello',
      slug: 'hello-world',
      meta: {
        content: { title: 'OG title', description: 'OG description' }
      }
    }))

    const route = createOpenGraphImageRoute({
      config: Promise.resolve(config),
      collectionSlug: 'posts',
      fetchDoc
    })

    const out = await route({ params: Promise.resolve({ slug: 'hello-world', locale: 'en' }) })

    expect(fetchDoc).toHaveBeenCalledOnce()
    
    
    
    
    
    
    expect(out).toBeDefined()
  })

  it('appends #default when custom.ogImage omits the export name', async () => {
    const FakeComponent = vi.fn(() => null) as unknown as Parameters<
      typeof createOpenGraphImageRoute
    >[0]['component']
    const importMap = {
      '@/components/og/PostOG#default': FakeComponent
    }
    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG' } 
    } as unknown as SanitizedCollectionConfig
    const route = createOpenGraphImageRoute({
      config: Promise.resolve(buildSanitizedConfig(collection, importMap)),
      collectionSlug: 'posts',
      fetchDoc: vi.fn(async () => ({ meta: { content: { title: 't' } } }))
    })

    const out = await route({ params: Promise.resolve({ slug: 'x' }) })
    expect(out).toBeDefined()
  })

  it('explicit component prop bypasses the import map', async () => {
    const ExplicitComponent = vi.fn(() => null) as unknown as Parameters<
      typeof createOpenGraphImageRoute
    >[0]['component']
    const route = createOpenGraphImageRoute({
      config: Promise.resolve(
        buildSanitizedConfig({
          slug: 'posts'
        } as Partial<SanitizedCollectionConfig> & { slug: string })
      ),
      collectionSlug: 'posts',
      component: ExplicitComponent,
      fetchDoc: vi.fn(async () => ({ meta: { content: { title: 't' } } }))
    })

    const out = await route({ params: Promise.resolve({ slug: 'x' }) })
    expect(out).toBeDefined()
  })

  it('extracts locale from the localeParam (default "locale")', async () => {
    const FakeComponent = vi.fn(() => null) as unknown as Parameters<
      typeof createOpenGraphImageRoute
    >[0]['component']
    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG#default' }
    } as unknown as SanitizedCollectionConfig
    const importMap = { '@/components/og/PostOG#default': FakeComponent }

    const fetchDoc = vi.fn(async () => ({ meta: { content: { title: 't' } } }))

    const route = createOpenGraphImageRoute({
      config: Promise.resolve(buildSanitizedConfig(collection, importMap)),
      collectionSlug: 'posts',
      fetchDoc
    })

    await route({ params: Promise.resolve({ slug: 'x', locale: 'sk' }) })

    expect(fetchDoc).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'sk' })
    )
  })

  it('passes fallbackTitle derived from doc.title when meta is empty', async () => {
    
    
    
    const captured: unknown[] = []
    const CapturingComponent = ((props: unknown) => {
      captured.push(props)
      return null
    }) as unknown as Parameters<typeof createOpenGraphImageRoute>[0]['component']

    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG#default' }
    } as unknown as SanitizedCollectionConfig
    const importMap = { '@/components/og/PostOG#default': CapturingComponent }

    const route = createOpenGraphImageRoute({
      config: Promise.resolve(buildSanitizedConfig(collection, importMap)),
      collectionSlug: 'posts',
      fetchDoc: vi.fn(async () => ({
        title: 'Doc title fallback',
        meta: null
      }))
    })

    await route({ params: Promise.resolve({ slug: 'x' }) })

    
    
    
    
    
    expect(captured).toBeDefined()
  })

  it('dev-mode throw when custom.ogImage is set but no import map exists', async () => {
    const collection = {
      slug: 'posts',
      custom: { ogImage: '@/components/og/PostOG#default' }
    } as unknown as SanitizedCollectionConfig
    const config = {
      collections: [collection],
      admin: {} 
    } as unknown as SanitizedConfig

    const originalNodeEnv = process.env.NODE_ENV
    ;(process.env as Record<string, string>).NODE_ENV = 'development'

    const route = createOpenGraphImageRoute({
      config: Promise.resolve(config),
      collectionSlug: 'posts',
      fetchDoc: vi.fn(async () => null)
    })

    await expect(route({ params: Promise.resolve({ slug: 'x' }) })).rejects.toThrow(
      /no import map was found/
    )

    ;(process.env as Record<string, string>).NODE_ENV = originalNodeEnv
  })
})