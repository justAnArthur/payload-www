import { describe, expect, it, mock } from 'bun:test'

const review = (coverage: Record<string, number>) =>
  Object.fromEntries(Object.entries(coverage).map(([locale, value]) => [locale, { summary: { coverage: value, slugMissing: false }, stale: false, reviewed: false }]))

mock.module('../src/review/loadReview', () => ({
  readLocales: () => ({ defaultLocale: 'en', targetLocales: ['sk', 'cs'] }),
  loadGlobalsReview: async () => ({ entities: [] }),
  loadCollectionReview: async () => ({
    totalPages: 1,
    entities: [
      { key: 'pages:1', id: 1, collectionSlug: 'pages', locales: review({ sk: 100, cs: 100 }) },
      { key: 'pages:2', id: 2, collectionSlug: 'pages', locales: review({ sk: 40, cs: 100 }) },
      { key: 'pages:3', id: 3, collectionSlug: 'pages', locales: review({ sk: 50, cs: 20 }) }
    ]
  })
}))

const { queueBulkTranslation } = await import('../src/review/bulk')

describe('queueBulkTranslation', () => {
  it('queues only incomplete locales and skips ones a pending job covers', async () => {
    const queued: any[] = []
    const req = {
      payload: {
        config: { custom: { translator: { resolvers: [{ key: 'openai' }], globals: [] } } },
        find: async () => ({ docs: [{ input: { collection: 'pages', id: 3, toLocales: ['cs'] } }] }),
        jobs: { queue: async (args: any) => queued.push(args.input) }
      }
    } as any

    const result = await queueBulkTranslation({ req, tab: 'pages', mode: 'untranslated' })

    expect(result).toEqual({ queuedDocuments: 2, queuedLocales: 2, skippedPending: 1 })
    expect(queued.map((each) => [each.id, each.toLocales, each.mode])).toEqual([[2, ['sk'], 'untranslated'], [3, ['sk'], 'untranslated']])
  })
})
