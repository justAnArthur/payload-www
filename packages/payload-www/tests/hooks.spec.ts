import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args)
}))

import {
  createCollectionCacheKey,
  createRevalidateCollectionGlobalHook
} from '../src/collections/hooks/createRevalidateCollectionGlobalHook'
import { populatePublishedAt } from '../src/collections/hooks/populatePublishedAt'

type MockLogger = { error: ReturnType<typeof vi.fn>; info?: ReturnType<typeof vi.fn> }

function mockLogger(): MockLogger {
  return { error: vi.fn(), info: vi.fn() }
}

type ReqOverrides = Partial<{
  locale: string
  context: Record<string, unknown>
  payload: unknown
  logger: MockLogger
}>

function buildReq(overrides: ReqOverrides = {}) {
  return {
    payload: {
      config: { localization: { defaultLocale: 'en', locales: ['en', 'uk'] } },
      logger: overrides.logger ?? mockLogger(),
      ...((overrides.payload as object | undefined) ?? {})
    },
    context: overrides.context ?? {},
    locale: overrides.locale,
    user: null
  }
}

beforeEach(() => {
  revalidateTag.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createCollectionCacheKey', () => {
  it('builds the collection cache key from slug + locale', () => {
    expect(createCollectionCacheKey({ collectionSlug: 'pages', slug: 'about', locale: 'en' })).toBe('pagesabout_en')
  })

  it('builds the global cache key from globalSlug + locale', () => {
    expect(createCollectionCacheKey({ globalSlug: 'header', locale: 'uk' })).toBe('header_uk')
  })
})

describe('createRevalidateCollectionGlobalHook', () => {
  const callChange = (
    hooks: ReturnType<typeof createRevalidateCollectionGlobalHook>,
    args: {
      doc: Record<string, unknown>
      previousDoc?: Record<string, unknown>
      collection: { slug: string }
      locale: string
      context?: Record<string, unknown>
    }
  ) =>
    hooks.afterChange({
      doc: args.doc as never,
      previousDoc: args.previousDoc as never,
      collection: args.collection as never,
      req: buildReq({ locale: args.locale, context: args.context })
    } as never)

  const callDelete = (
    hooks: ReturnType<typeof createRevalidateCollectionGlobalHook>,
    args: {
      doc: Record<string, unknown>
      collection: { slug: string }
      locale: string
      context?: Record<string, unknown>
    }
  ) =>
    hooks.afterDelete({
      doc: args.doc as never,
      collection: args.collection as never,
      req: buildReq({ locale: args.locale, context: args.context })
    } as never)

  it('returns { afterChange, afterDelete }', () => {
    const hooks = createRevalidateCollectionGlobalHook()
    expect(typeof hooks.afterChange).toBe('function')
    expect(typeof hooks.afterDelete).toBe('function')
  })

  it('afterChange: published doc fires collection_<slug>_<slug>_<locale> tag', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await callChange(hooks, {
      doc: { _status: 'published', slug: 'about' },
      collection: { slug: 'pages' },
      locale: 'en'
    })

    expect(revalidateTag).toHaveBeenCalledWith('pagesabout_en', 'max')
  })

  it('afterChange: draft doc does not fire revalidation', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await callChange(hooks, {
      doc: { _status: 'draft', slug: 'about' },
      collection: { slug: 'pages' },
      locale: 'en'
    })

    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('afterChange: unpublish fires the old slug tag', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await callChange(hooks, {
      doc: { _status: 'draft', slug: 'about' },
      previousDoc: { _status: 'published', slug: 'about' },
      collection: { slug: 'pages' },
      locale: 'en'
    })

    expect(revalidateTag).toHaveBeenCalledWith('pagesabout_en', 'max')
  })

  it('afterChange: slug rename fires both old and new tags', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await callChange(hooks, {
      doc: { _status: 'published', slug: 'new-about' },
      previousDoc: { _status: 'published', slug: 'old-about' },
      collection: { slug: 'pages' },
      locale: 'en'
    })

    const tags = revalidateTag.mock.calls.map((c) => c[0]).sort()
    expect(tags).toEqual(['pagesnew-about_en', 'pagesold-about_en'])
  })

  it('afterChange: returns the doc unchanged', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    const doc = { _status: 'published', slug: 'about' }
    const result = await callChange(hooks, {
      doc,
      collection: { slug: 'pages' },
      locale: 'en'
    })
    expect(result).toBe(doc)
  })

  it('afterDelete: fires the collection tag for the deleted slug', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await callDelete(hooks, {
      doc: { slug: 'about' },
      collection: { slug: 'pages' },
      locale: 'uk'
    })

    expect(revalidateTag).toHaveBeenCalledWith('pagesabout_uk', 'max')
  })

  it('afterDelete: returns the doc unchanged', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    const doc = { slug: 'about' }
    const result = await callDelete(hooks, {
      doc,
      collection: { slug: 'pages' },
      locale: 'en'
    })
    expect(result).toBe(doc)
  })

  it('global path: afterChange fires global_<slug>_<locale> tag', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await hooks.afterChange({
      doc: {} as never,
      global: { slug: 'header' } as never,
      req: buildReq({ locale: 'uk' })
    } as never)

    expect(revalidateTag).toHaveBeenCalledWith('header_uk', 'max')
  })

  it('global path: afterDelete fires global_<slug>_<locale> tag', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    await hooks.afterDelete({
      doc: {} as never,
      global: { slug: 'footer' } as never,
      req: buildReq({ locale: 'en' })
    } as never)

    expect(revalidateTag).toHaveBeenCalledWith('footer_en', 'max')
  })

  it('global path: afterChange returns the doc unchanged', async () => {
    const hooks = createRevalidateCollectionGlobalHook()
    const doc = { title: 'Header' }
    const result = await hooks.afterChange({
      doc: doc as never,
      global: { slug: 'header' } as never,
      req: buildReq({ locale: 'en' })
    } as never)
    expect(result).toBe(doc)
  })
})

describe('populatePublishedAt', () => {
  const call = (
    args: { data: Record<string, unknown>; operation: 'create' | 'update'; reqData?: unknown }
  ) =>
    populatePublishedAt({
      data: args.data as never,
      operation: args.operation,
      req: { data: args.reqData } as never
    } as never)

  it('stamps publishedAt on create when not set', () => {
    const result = call({
      data: { title: 'X' },
      operation: 'create',
      reqData: { title: 'X' }
    })
    expect(result).toMatchObject({ title: 'X' })
    expect((result as { publishedAt: Date }).publishedAt).toBeInstanceOf(Date)
  })

  it('stamps publishedAt on update when not set', () => {
    const result = call({
      data: { title: 'X' },
      operation: 'update',
      reqData: { title: 'X' }
    })
    expect((result as { publishedAt: Date }).publishedAt).toBeInstanceOf(Date)
  })

  it('does not overwrite an existing publishedAt when data already carries it', () => {
    const existing = new Date('2024-01-01T00:00:00.000Z')
    const result = call({
      data: { title: 'X', publishedAt: existing },
      operation: 'create',
      reqData: { publishedAt: existing }
    })
    expect((result as { publishedAt: Date }).publishedAt).toBe(existing)
  })

  it('returns data unchanged when req.data is missing', () => {
    const data = { title: 'X' }
    const result = call({
      data,
      operation: 'create',
      reqData: undefined
    })
    expect(result).toBe(data)
  })
})
