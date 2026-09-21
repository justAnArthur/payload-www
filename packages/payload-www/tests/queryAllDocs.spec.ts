import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }))

type Doc = { id: number; slug: string }

const docs: Doc[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, slug: `post-${i + 1}` }))

// mirrors payload's find operation: without a limit, paginated reads cap at 10
const find = vi.fn(async ({ limit, pagination = true }: { limit?: number; pagination?: boolean }) => {
  const usePagination = pagination && limit !== 0
  const sanitizedLimit = limit ?? (usePagination ? 10 : 0)
  const page = sanitizedLimit > 0 ? docs.slice(0, sanitizedLimit) : docs
  return { docs: page.map(({ id }) => ({ id })), totalDocs: docs.length, page: 1, totalPages: 1 }
})

const fakePayload = {
  config: { collections: [], globals: [], custom: { payloadRevalidate: { lists: {}, options: {} } } },
  find,
  findByID: async ({ id }: { id: number }) => docs.find((doc) => doc.id === id) ?? null
}

vi.mock('payload', () => ({ getPayload: async () => fakePayload }))

const { queryAllDocs, seedPayloadCache } = await import('../src/render/metadata/query')

describe('queryAllDocs', () => {
  beforeAll(() => {
    seedPayloadCache({ config: Promise.resolve({} as never) })
  })

  it('returns every doc in the collection, not just the first page', async () => {
    const result = await queryAllDocs({ collectionSlug: 'posts', locale: 'en' })

    expect(result).toHaveLength(docs.length)
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'posts', pagination: false }))
  })
})
