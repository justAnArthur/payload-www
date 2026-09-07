import { describe, expect, it } from 'vitest'

import {
  createAliasCacheKey,
  createAllCacheKey,
  createCollectionCacheKey,
  createDraftCacheKey,
  createGlobalCacheKey,
  createJoinCacheKey,
  createListCacheKey,
  prefixedTag
} from '../src/collections/cacheKeys'
import { populatePublishedAt } from '../src/collections/hooks/populatePublishedAt'

describe('cacheKeys', () => {
  it('createCollectionCacheKey joins collectionSlug : slug _ locale', () => {
    expect(createCollectionCacheKey({ collectionSlug: 'pages', slug: 'about', locale: 'en' })).toBe('pages:about_en')
  })

  it('createCollectionCacheKey omits the locale suffix when none given', () => {
    expect(createCollectionCacheKey({ collectionSlug: 'pages', slug: 'about' })).toBe('pages:about')
  })

  it('createAliasCacheKey produces collectionSlug : idField : slug', () => {
    expect(createAliasCacheKey({ collectionSlug: 'pages', slug: 'about', idField: 'slug' })).toBe('pages:slug:about')
  })

  it('createListCacheKey uses the _all scope by default', () => {
    expect(createListCacheKey({ collectionSlug: 'posts', locale: 'en' })).toBe('posts:list:_all:en')
  })

  it('createListCacheKey respects the scope argument', () => {
    expect(createListCacheKey({ collectionSlug: 'posts', scope: 'recent', locale: 'en' })).toBe('posts:list:recent:en')
  })

  it('createJoinCacheKey uses the canonical 4-segment shape', () => {
    expect(createJoinCacheKey({ collectionSlug: 'posts', joinField: 'author', parentId: 7 })).toBe('posts:join:author:7')
  })

  it('createGlobalCacheKey produces global : slug _ locale', () => {
    expect(createGlobalCacheKey({ globalSlug: 'header', locale: 'en' })).toBe('global:header_en')
  })

  it('createAllCacheKey returns the bare all tag without a prefix', () => {
    expect(createAllCacheKey()).toBe('all')
  })

  it('createAllCacheKey prefixes the all tag when a prefix is given', () => {
    expect(createAllCacheKey('app')).toBe('app:all')
  })

  it('createDraftCacheKey appends :draft to its base', () => {
    expect(createDraftCacheKey('pages:about_en')).toBe('pages:about_en:draft')
  })

  it('prefixedTag is a no-op when no prefix is given', () => {
    expect(prefixedTag('pages:about_en')).toBe('pages:about_en')
  })

  it('prefixedTag namespaces its tag with the prefix', () => {
    expect(prefixedTag('pages:about_en', 'app')).toBe('app:pages:about_en')
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
