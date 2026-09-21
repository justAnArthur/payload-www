import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }))

type Doc = { id: number; slug: string; _status: 'draft' | 'published' }

const published: Doc[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, slug: `post-${i + 1}`, _status: 'published' }))
// never published, so it sits in the main collection with _status: 'draft'
const draftOnly: Doc = { id: 100, slug: 'draft-only', _status: 'draft' }
const docs: Doc[] = [...published.slice(0, 3), draftOnly, ...published.slice(3)]

type FindArgs = {
  limit?: number
  pagination?: boolean
  overrideAccess?: boolean
  where?: { slug?: { equals?: string } }
}

// like payload's local api: access is skipped unless overrideAccess is false, and then the
// collection's authenticatedOrPublished read access only lets published docs through
const visible = (doc: Doc, overrideAccess = true) => overrideAccess || doc._status === 'published'

// like payload's find operation: without a limit, paginated reads cap at 10
const find = vi.fn(async ({ limit, pagination = true, overrideAccess, where }: FindArgs) => {
  const usePagination = pagination && limit !== 0
  const sanitizedLimit = limit ?? (usePagination ? 10 : 0)
  const matching = docs
    .filter((doc) => visible(doc, overrideAccess))
    .filter((doc) => where?.slug?.equals === undefined || doc.slug === where.slug.equals)
  const page = sanitizedLimit > 0 ? matching.slice(0, sanitizedLimit) : matching
  return { docs: page, totalDocs: matching.length, page: 1, totalPages: 1 }
})

const findByID = async ({ id, overrideAccess }: { id: number; overrideAccess?: boolean }) =>
  docs.find((doc) => doc.id === id && visible(doc, overrideAccess)) ?? null

const fakePayload = {
  config: { collections: [], globals: [], custom: { payloadRevalidate: { lists: {}, options: {} } } },
  find,
  findByID
}

vi.mock('payload', () => ({ getPayload: async () => fakePayload }))

const { queryAllDocs, queryDocBySlug, seedPayloadCache } = await import('../src/render/metadata/query')

beforeAll(() => {
  seedPayloadCache({ config: Promise.resolve({} as never) })
})

describe('queryAllDocs', () => {
  it('returns every doc in the collection, not just the first page', async () => {
    const result = await queryAllDocs({ collectionSlug: 'posts', locale: 'en' })

    expect(result).toHaveLength(published.length)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'posts', pagination: false }))
  })

  it('leaves out draft-only docs', async () => {
    const slugs = (await queryAllDocs({ collectionSlug: 'posts', locale: 'en' })).map((doc) => doc.slug)

    expect(slugs).not.toContain('draft-only')
    expect(slugs).toContain('post-1')
  })
})

describe('queryDocBySlug', () => {
  it('finds a published doc', async () => {
    const doc = await queryDocBySlug({ collectionSlug: 'posts', slug: 'post-1', locale: 'en' })

    expect(doc).toMatchObject({ id: 1 })
  })

  it('does not find a draft-only doc on a public read', async () => {
    expect(await queryDocBySlug({ collectionSlug: 'posts', slug: 'draft-only', locale: 'en' })).toBeNull()
  })

  it('finds a draft-only doc on a draft read', async () => {
    const doc = await queryDocBySlug({ collectionSlug: 'posts', slug: 'draft-only', locale: 'en', draft: true })

    expect(doc).toMatchObject({ id: draftOnly.id })
  })
})
