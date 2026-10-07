import type { CollectionAfterChangeHook, CollectionConfig, Config } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { updateTag } = vi.hoisted(() => ({ updateTag: vi.fn() }))

vi.mock('next/cache', () => ({ updateTag, revalidateTag: vi.fn() }))

const { revalidateWithContentLists } = await import('../src/revalidate/contentLists')

const posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text' },
    {
      type: 'tabs',
      tabs: [
        { label: 'Content', fields: [{ name: 'content', type: 'richText' }] },
        { label: 'Meta', fields: [{ name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true }] }
      ]
    },
    { name: 'publishedAt', type: 'date' }
  ]
}

const media: CollectionConfig = { slug: 'media', custom: { revalidate: false }, fields: [{ name: 'alt', type: 'text' }] }

type Marker = { lists: Record<string, string[]>; options: { collections: Record<string, { lists: Record<string, string[]> }> } }

async function build(options = {}) {
  const config = await revalidateWithContentLists(options)({ collections: [posts, media] } as Config)
  return { config, marker: config.custom?.payloadRevalidate as Marker }
}

async function save(doc: Record<string, unknown>, previousDoc: Record<string, unknown>) {
  const { config } = await build()
  const hook = config.collections?.find((c) => c.slug === 'posts')?.hooks?.afterChange?.at(-1) as CollectionAfterChangeHook
  await hook({ doc, previousDoc, operation: 'update', req: { context: {} } } as never)
  return updateTag.mock.calls.flat()
}

beforeEach(() => {
  updateTag.mockClear()
})

describe('revalidateWithContentLists', () => {
  it('declares a content list over every top-level field, tabs included', async () => {
    const { marker } = await build()

    expect(marker.options.collections.posts.lists.content).toEqual(['title', 'content', 'categories', 'publishedAt'])
    expect(marker.lists.posts).toContain('content')
  })

  it('keeps the scopes a host declares', async () => {
    const { marker } = await build({ collections: { posts: { lists: { archive: ['publishedAt'] } } } })

    expect(marker.lists.posts).toEqual(expect.arrayContaining(['content', 'archive']))
  })

  it('leaves opted-out collections alone', async () => {
    const { marker } = await build({ collections: { posts: false } })

    expect(marker.lists.posts).toBeUndefined()
    expect(marker.lists.media).toBeUndefined()
  })

  it('busts the content list when any field of a published doc changes', async () => {
    const busted = await save({ id: 1, title: 'new', _status: 'published' }, { id: 1, title: 'old', _status: 'published' })

    expect(busted).toContain('posts:list:content')
  })

  it('leaves the content list alone on a save that changes nothing', async () => {
    const busted = await save(
      { id: 1, title: 'same', _status: 'published', updatedAt: '2026-10-07' },
      { id: 1, title: 'same', _status: 'published', updatedAt: '2026-10-06' }
    )

    expect(busted).not.toContain('posts:list:content')
  })
})
