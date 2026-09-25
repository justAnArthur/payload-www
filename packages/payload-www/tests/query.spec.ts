import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { cacheTag } = vi.hoisted(() => ({ cacheTag: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag }))

type Doc = { id: number; slug: string; _status: 'draft' | 'published'; image: number }

const hero = { id: 7, url: '/media/hero.webp', alt: 'hero' }

const published: Doc[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, slug: `post-${i + 1}`, _status: 'published', image: hero.id }))
// never published, so it sits in the main collection with _status: 'draft'
const draftOnly: Doc = { id: 100, slug: 'draft-only', _status: 'draft', image: hero.id }
const docs: Doc[] = [...published.slice(0, 3), draftOnly, ...published.slice(3)]

type FindArgs = {
  depth?: number
  limit?: number
  pagination?: boolean
  overrideAccess?: boolean
  where?: { slug?: { equals?: string } }
}

// the local api skips access unless overrideAccess is false, then authenticatedOrPublished keeps published docs
const visible = (doc: Doc, overrideAccess = true) => overrideAccess || doc._status === 'published'

// like payload: a depth of 0 leaves an upload field as the stored id
const atDepth = (doc: Doc, depth = 0) => ({ ...doc, image: depth > 0 ? hero : doc.image })

// like payload's find operation: without a limit, paginated reads cap at 10
const find = vi.fn(async ({ depth, limit, pagination = true, overrideAccess, where }: FindArgs) => {
  const cap = limit ?? (pagination ? 10 : 0)
  const matching = docs
    .filter((doc) => visible(doc, overrideAccess))
    .filter((doc) => !where?.slug || doc.slug === where.slug.equals)
  const page = cap ? matching.slice(0, cap) : matching
  return { docs: page.map((doc) => atDepth(doc, depth)), totalDocs: matching.length, page: 1, totalPages: 1 }
})

const findByID = vi.fn(async ({ depth, id, overrideAccess }: FindArgs & { id: number }) => {
  const doc = docs.find((doc) => doc.id === id && visible(doc, overrideAccess))
  return doc ? atDepth(doc, depth) : null
})

const posts = {
  slug: 'posts',
  fields: [{ name: 'image', type: 'upload', relationTo: 'media' }]
}

const fakePayload = {
  config: { collections: [posts], globals: [], blocks: [], custom: { payloadRevalidate: { lists: {}, options: {} } } },
  find,
  findByID
}

vi.mock('payload', () => ({ getPayload: async () => fakePayload }))

const { queryAllDocs, queryDocBySlug, seedPayloadCache } = await import('../src/render/metadata/query')

beforeAll(() => {
  seedPayloadCache({ config: Promise.resolve({} as never) })
})

beforeEach(() => {
  cacheTag.mockClear()
})

const appliedTags = () => cacheTag.mock.calls.flat()

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

describe('render depth', () => {
  it('populates an upload field as a document, not an id', async () => {
    const doc = await queryDocBySlug({ collectionSlug: 'posts', slug: 'post-1', locale: 'en' })

    expect(doc?.image).toMatchObject({ id: hero.id, url: hero.url })
  })

  it('tags the embedded upload so editing it busts the entry', async () => {
    await queryDocBySlug({ collectionSlug: 'posts', slug: 'post-1', locale: 'en' })

    expect(appliedTags()).toEqual(expect.arrayContaining(['posts:1', `media:${hero.id}`]))
  })

  it('lets a caller opt back out', async () => {
    const doc = await queryDocBySlug({ collectionSlug: 'posts', slug: 'post-1', locale: 'en', depth: 0 })

    expect(doc?.image).toBe(hero.id)
  })

  it('leaves enumeration shallow', async () => {
    const [doc] = await queryAllDocs({ collectionSlug: 'posts', locale: 'en' })

    expect(doc.image).toBe(hero.id)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ depth: 0 }))
  })
})
