import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'





const revalidatePath = vi.fn()
const revalidateTag = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args)
}))

import { allLocales, prefixFor, resolveLocale } from '../src/render/_locale'
import { shouldSkipRevalidate } from '../src/collections/hooks/_shared'
import { createRevalidateCollectionHook } from '../src/collections/hooks/revalidateCollection'
import { createRevalidatePageHooks } from '../src/collections/hooks/revalidateCollection'
import { createRevalidateGlobalHook } from '../src/collections/hooks/revalidateGlobal'



type MockPayload = {
  logger: { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> }
}

function mockPayload(): MockPayload {
  return {
    logger: {
      error: vi.fn(),
      info: vi.fn()
    }
  }
}

function buildReq(
  overrides: Partial<{ locale: string; context: Record<string, unknown>; payload: unknown; logger: MockPayload['logger'] }> = {}
) {




  return {
    payload: {
      config: { localization: { defaultLocale: 'en', locales: ['en', 'uk'] } },
      logger: overrides.logger ?? { error: vi.fn(), info: vi.fn() },
      ...((overrides.payload as object | undefined) ?? {})
    },
    context: overrides.context ?? {},
    locale: overrides.locale,
    user: null
  } as unknown as Parameters<ReturnType<typeof createRevalidateGlobalHook>>[0]['req']
}



describe('render/_locale', () => {
  describe('prefixFor', () => {
    it('always-prefixed mode returns /<locale>', () => {
      expect(prefixFor('en', 'en', 'always')).toBe('/en')
      expect(prefixFor('uk', 'en', 'always')).toBe('/uk')
    })

    it('as-needed drops the prefix for the default locale', () => {
      expect(prefixFor('en', 'en', 'as-needed')).toBe('')
      expect(prefixFor('uk', 'en', 'as-needed')).toBe('/uk')
    })

    it('never mode returns empty regardless of locale', () => {
      expect(prefixFor('en', 'en', 'never')).toBe('')
      expect(prefixFor('uk', 'en', 'never')).toBe('')
    })
  })

  describe('resolveLocale', () => {
    it('returns the explicit request locale', () => {
      expect(resolveLocale({ locale: 'uk', payload: { config: { localization: { defaultLocale: 'en' } } } })).toBe('uk')
    })

    it('falls back to config defaultLocale when request locale is empty', () => {
      expect(resolveLocale({ locale: '', payload: { config: { localization: { defaultLocale: 'en' } } } })).toBe('en')
    })

    it('falls back to config defaultLocale when request locale is missing', () => {
      expect(resolveLocale({ payload: { config: { localization: { defaultLocale: 'en' } } } })).toBe('en')
    })

    it('returns empty string when no locale info is available', () => {
      expect(resolveLocale({})).toBe('')
      expect(resolveLocale(null)).toBe('')
      expect(resolveLocale('not an object')).toBe('')
    })

    it('handles missing payload / config / localization gracefully', () => {
      expect(resolveLocale({ locale: 'fr' })).toBe('fr')
      expect(resolveLocale({ payload: {} })).toBe('')
    })
  })

  describe('allLocales', () => {
    it('returns string locales', () => {
      expect(allLocales({ payload: { config: { localization: { locales: ['en', 'uk'] } } } })).toEqual(['en', 'uk'])
    })

    it('returns object locales via their .code field', () => {
      expect(allLocales({ payload: { config: { localization: { locales: [{ code: 'en' }, { code: 'uk' }] } } } })).toEqual(['en', 'uk'])
    })

    it('returns empty array when no locales declared', () => {
      expect(allLocales({ payload: { config: { localization: { locales: [] } } } })).toEqual([])
      expect(allLocales({})).toEqual([])
      expect(allLocales(null)).toEqual([])
    })

    it('skips invalid entries (non-string codes, empty strings)', () => {
      expect(allLocales({ payload: { config: { localization: { locales: ['en', '', null, { code: 'uk' }, { code: 42 }] } } } })).toEqual(['en', 'uk'])
    })
  })
})



describe('render/hooks/_shared', () => {
  describe('shouldSkipRevalidate', () => {
    it('returns true when context.disableRevalidate is truthy', () => {
      expect(shouldSkipRevalidate({ disableRevalidate: true })).toBe(true)
      expect(shouldSkipRevalidate({ disableRevalidate: 'yes' })).toBe(true)
    })

    it('returns false when flag is missing or falsy', () => {
      expect(shouldSkipRevalidate({})).toBe(false)
      expect(shouldSkipRevalidate({ disableRevalidate: false })).toBe(false)
      expect(shouldSkipRevalidate(undefined)).toBe(false)
    })
  })
})



describe('createRevalidateGlobalHook', () => {
  let payload: MockPayload
  beforeEach(() => {
    revalidatePath.mockClear()
    revalidateTag.mockClear()
    payload = mockPayload()
  })

  const callGlobal = (
    hook: ReturnType<typeof createRevalidateGlobalHook>,
    args: { doc: Record<string, unknown>; locale?: string; context?: Record<string, unknown> }
  ) => hook({
    doc: args.doc as never,
    req: buildReq({ locale: args.locale, context: args.context, logger: payload.logger })
  } as unknown as Parameters<typeof hook>[0])

  it('fires global_<slug> and global_<slug>_<locale> tags', async () => {
    const hook = createRevalidateGlobalHook('header')
    await callGlobal(hook, { doc: { id: 1 }, locale: 'uk' })

    expect(revalidateTag).toHaveBeenCalledTimes(2)
    expect(revalidateTag).toHaveBeenCalledWith('global_header', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('global_header_uk', 'max')
  })

  it('no-ops when context.disableRevalidate is set', async () => {
    const hook = createRevalidateGlobalHook('footer')
    await callGlobal(hook, { doc: { id: 2 }, locale: 'en', context: { disableRevalidate: true } })

    expect(revalidateTag).not.toHaveBeenCalled()
    expect(payload.logger.info).not.toHaveBeenCalled()
  })

  it('returns the doc unchanged', async () => {
    const hook = createRevalidateGlobalHook('header')
    const doc = { id: 99, title: 'Header' }
    const result = await callGlobal(hook, { doc, locale: 'en' })
    expect(result).toBe(doc)
  })
})



describe('createRevalidatePageHooks', () => {
  let payload: MockPayload
  beforeEach(() => {
    revalidatePath.mockClear()
    revalidateTag.mockClear()
    payload = mockPayload()
  })

  const call = (
    hooks: ReturnType<typeof createRevalidatePageHooks>,
    op: 'change' | 'delete',
    args: {
      doc: Record<string, unknown>
      previousDoc?: Record<string, unknown>
      locale?: string
      context?: Record<string, unknown>
    }
  ) => {
    const req = buildReq({ locale: args.locale, context: args.context, logger: payload.logger })
    if (op === 'change') {
      return hooks.afterChange({
        doc: args.doc as never,
        previousDoc: args.previousDoc as never,
        req
      } as never)
    }
    return hooks.afterDelete({ doc: args.doc as never, req } as never)
  }

  it('afterChange: published doc fires path + pages-sitemap tag', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'about' }, locale: 'en' })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
    expect(revalidateTag).toHaveBeenCalledWith('pages-sitemap', 'max')
  })

  it('afterChange: home page (empty slug) fires /<locale>', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'published', slug: '' }, locale: 'uk' })

    expect(revalidatePath).toHaveBeenCalledWith('/uk')
    expect(revalidateTag).toHaveBeenCalledWith('pages-sitemap', 'max')
  })

  it('afterChange: draft does not fire revalidation', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'draft', slug: 'about' }, locale: 'en' })

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('afterChange: unpublish fires the old path', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', {
      doc: { _status: 'draft', slug: 'about' },
      previousDoc: { _status: 'published', slug: 'about' },
      locale: 'en'
    })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
    expect(revalidateTag).toHaveBeenCalledWith('pages-sitemap', 'max')
  })

  it('afterDelete: fires path for the deleted slug', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'delete', { doc: { slug: 'about' }, locale: 'en' })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
    expect(revalidateTag).toHaveBeenCalledWith('pages-sitemap', 'max')
  })

  it('afterDelete: returns doc unchanged', async () => {
    const hooks = createRevalidatePageHooks()
    const doc = { slug: 'about' }
    const result = await call(hooks, 'delete', { doc, locale: 'en' })
    expect(result).toBe(doc)
  })

  it('no-ops when context.disableRevalidate is set', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', {
      doc: { _status: 'published', slug: 'about' },
      locale: 'en',
      context: { disableRevalidate: true }
    })
    await call(hooks, 'delete', { doc: { slug: 'about' }, locale: 'en', context: { disableRevalidate: true } })

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(payload.logger.info).not.toHaveBeenCalled()
  })

  it('falls back to config defaultLocale when request locale is missing', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'about' } })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
  })



  it('afterChange: fans out revalidatePath across every configured locale', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'about' }, locale: 'en' })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/about')
  })

  it('afterDelete: fans out across every locale, not just the request locale', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'delete', { doc: { slug: 'about' }, locale: 'uk' })

    expect(revalidatePath).toHaveBeenCalledWith('/en/about')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/about')
  })

  it('afterChange: fires collection_<slug>_<id> tag', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'about', id: 42 }, locale: 'en' })

    expect(revalidateTag).toHaveBeenCalledWith('collection_pages_42', 'max')
  })

  it('afterChange: localePrefix as-needed drops the prefix for the default locale', async () => {
    const hooks = createRevalidatePageHooks({ localePrefix: 'as-needed', defaultLocale: 'en' })
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'about' }, locale: 'en' })

    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/about')
    expect(revalidatePath).not.toHaveBeenCalledWith('/en/about')
  })

  it('afterChange: localePrefix as-needed fires empty string for home in default locale', async () => {
    const hooks = createRevalidatePageHooks({ localePrefix: 'as-needed', defaultLocale: 'en' })
    await call(hooks, 'change', { doc: { _status: 'published', slug: '' }, locale: 'en' })


    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('afterChange: slug rename fires both old and new paths', async () => {
    const hooks = createRevalidatePageHooks()
    await call(hooks, 'change', {
      doc: { _status: 'published', slug: 'new-about', id: 7 },
      previousDoc: { _status: 'published', slug: 'old-about' },
      locale: 'en'
    })


    expect(revalidatePath).toHaveBeenCalledWith('/en/new-about')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/new-about')

    expect(revalidatePath).toHaveBeenCalledWith('/en/old-about')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/old-about')
  })



  it('createRevalidateCollectionHook with collectionSlug=posts wires through /posts/<slug>', async () => {
    const hooks = createRevalidateCollectionHook({
      collectionSlug: 'posts',
      urlPathPrefix: '/posts'
    })
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'hello', id: 5 }, locale: 'en' })

    expect(revalidatePath).toHaveBeenCalledWith('/en/posts/hello')
    expect(revalidatePath).toHaveBeenCalledWith('/uk/posts/hello')
    expect(revalidateTag).toHaveBeenCalledWith('collection_posts_5', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('posts-sitemap', 'max')
  })

  it('createRevalidateCollectionHook respects sitemapTag: false', async () => {
    const hooks = createRevalidateCollectionHook({
      collectionSlug: 'custom',
      sitemapTag: false
    })
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'x', id: 1 }, locale: 'en' })

    expect(revalidateTag).not.toHaveBeenCalledWith('custom-sitemap')
    expect(revalidateTag).toHaveBeenCalledWith('collection_custom_1', 'max')
  })

  it('createRevalidateCollectionHook with custom sitemapTag fires that tag', async () => {
    const hooks = createRevalidateCollectionHook({
      collectionSlug: 'custom',
      sitemapTag: 'my-sitemap'
    })
    await call(hooks, 'change', { doc: { _status: 'published', slug: 'x', id: 1 }, locale: 'en' })

    expect(revalidateTag).toHaveBeenCalledWith('my-sitemap', 'max')
    expect(revalidateTag).not.toHaveBeenCalledWith('custom-sitemap')
  })

  it('createRevalidatePageHooks is a deprecated alias for createRevalidateCollectionHook(pages)', () => {




    const pages1 = createRevalidatePageHooks({ localePrefix: 'as-needed', defaultLocale: 'en' })
    const pages2 = createRevalidateCollectionHook({
      collectionSlug: 'pages',
      urlPathPrefix: '',
      localePrefix: 'as-needed',
      defaultLocale: 'en'
    })

    revalidatePath.mockClear()
    revalidateTag.mockClear()
    pages1.afterChange({
      doc: { _status: 'published', slug: 'about', id: 1 },
      previousDoc: undefined as never,
      req: buildReq({ locale: 'en', logger: payload.logger })
    } as never)
    const aliasCalls = revalidatePath.mock.calls.length + revalidateTag.mock.calls.length

    revalidatePath.mockClear()
    revalidateTag.mockClear()
    pages2.afterChange({
      doc: { _status: 'published', slug: 'about', id: 1 },
      previousDoc: undefined as never,
      req: buildReq({ locale: 'en', logger: payload.logger })
    } as never)
    const canonicalCalls = revalidatePath.mock.calls.length + revalidateTag.mock.calls.length

    expect(aliasCalls).toBe(canonicalCalls)
  })
})

afterEach(() => {
  vi.clearAllMocks()
})
