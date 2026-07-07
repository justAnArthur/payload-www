import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAutoTranslateCollectionHook,
  createAutoTranslateGlobalHook
} from '../../../plugins/translate/src/jobs'

type MockLogger = { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> }

type MockPayload = {
  jobs: { queue: ReturnType<typeof vi.fn> }
  logger: MockLogger
}

function mockPayload(overrides: Partial<MockPayload> = {}): MockPayload {
  return {
    jobs: { queue: vi.fn().mockResolvedValue({ id: `job-${Math.random().toString(36).slice(2)}` }) },
    logger: { error: vi.fn(), info: vi.fn() },
    ...overrides
  }
}

type BuildReqArgs = {
  locale?: string
  defaultLocale?: string
  locales?: string[]
  resolvers?: Array<{ key: string }>
  user?: unknown
  context?: Record<string, unknown>
  payload?: MockPayload
}

function buildReq(args: BuildReqArgs = {}) {
  const payload = args.payload ?? mockPayload()
  const localization = {
    defaultLocale: args.defaultLocale ?? 'en',
    locales: args.locales ?? ['en', 'uk', 'de']
  }
  
  
  
  
  
  const resolvers = 'resolvers' in args ? args.resolvers : [{ key: 'openai' }]
  const user = 'user' in args ? args.user : { id: 1, email: 'test@example.com' }
  return {
    payload: {
      ...payload,
      config: {
        localization,
        custom: { translator: { resolvers: resolvers ?? [] } }
      }
    },
    locale: args.locale,
    user,
    context: args.context ?? {}
  }
}



describe('createAutoTranslateCollectionHook', () => {
  let payload: MockPayload
  beforeEach(() => {
    payload = mockPayload()
  })

  const callHook = (
    hook: ReturnType<typeof createAutoTranslateCollectionHook>['afterChange'],
    args: { doc: Record<string, unknown>; req: ReturnType<typeof buildReq> }
  ) => hook({
    doc: args.doc as never,
    req: args.req as never
  } as never)

  it('queues one workflow for the document carrying all non-default locales', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 42, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    // One workflow per document (locales handled sequentially inside it), not one per locale.
    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(payload.jobs.queue).toHaveBeenCalledWith({
      workflow: 'translateEntityToLocales',
      input: {
        id: 42,
        updatedAt: '2026-06-22T10:00:00.000Z',
        collection: 'pages',
        fromLocale: 'en',
        resolver: 'openai',
        toLocales: ['uk', 'de']
      }
    })
  })

  it('honours a custom workflow slug', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({
      collectionSlug: 'pages',
      workflowSlug: 'customTranslate'
    })
    const req = buildReq({ locale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({ workflow: 'customTranslate' })
    )
  })

  it('uses the explicit resolverKey when provided', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({
      collectionSlug: 'pages',
      resolverKey: 'openai'
    })
    
    
    
    
    const req = buildReq({ locale: 'en', payload, resolvers: [{ key: 'openai' }, { key: 'google' }] })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.logger.error).not.toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('no resolver key available') })
    )
  })

  it('falls back to the first resolver key when resolverKey is omitted', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({
      locale: 'en',
      payload,
      resolvers: [{ key: 'openai' }, { key: 'google' }]
    })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.logger.error).not.toHaveBeenCalled()
  })

  it('logs an error and bails when no resolvers are configured', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload, resolvers: [] }) 

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('no resolver key available') })
    )
  })

  it('skips when request locale is missing', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ payload }) 

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('skips when request locale is not the default locale', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'uk', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('skips when no user is attached (system-initiated change)', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload, user: null })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('skips drafts when onlyOnPublished is true (default)', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'draft', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('fires on drafts when onlyOnPublished is false', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({
      collectionSlug: 'pages',
      onlyOnPublished: false
    })
    const req = buildReq({ locale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'draft', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).toHaveBeenCalled()
  })

  it('respects context.disableAutoTranslate', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload, context: { disableAutoTranslate: true } })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('uses explicit defaultLocale override instead of req config', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({
      collectionSlug: 'pages',
      defaultLocale: 'de'
    })
    
    
    const reqEn = buildReq({ locale: 'en', defaultLocale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req: reqEn
    })

    expect(payload.jobs.queue).not.toHaveBeenCalled()

    const reqDe = buildReq({ locale: 'de', defaultLocale: 'en', payload })
    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req: reqDe
    })


    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ fromLocale: 'de', toLocales: ['en', 'uk'] })
      })
    )
  })

  it('uses explicit targetLocales override', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({
      collectionSlug: 'pages',
      targetLocales: ['fr']
    })
    const req = buildReq({ locale: 'en', payload })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(payload.jobs.queue).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ toLocales: ['fr'] }) })
    )
  })

  it('returns the doc unchanged', async () => {
    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload })
    const doc = { id: 1, _status: 'published', title: 'Hello' }

    const result = await callHook(afterChange, { doc, req })

    expect(result).toBe(doc)
  })

  it('logs an error when queuing the workflow fails', async () => {
    payload.jobs.queue.mockRejectedValueOnce(new Error('queue down'))

    const { afterChange } = createAutoTranslateCollectionHook({ collectionSlug: 'pages' })
    const req = buildReq({ locale: 'en', payload, locales: ['en', 'uk', 'de'] })

    await callHook(afterChange, {
      doc: { id: 1, _status: 'published', updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('failed to queue') })
    )
  })
})



describe('createAutoTranslateGlobalHook', () => {
  let payload: MockPayload
  beforeEach(() => {
    payload = mockPayload()
  })

  const callHook = (
    hook: ReturnType<typeof createAutoTranslateGlobalHook>,
    args: { doc: Record<string, unknown>; req: ReturnType<typeof buildReq> }
  ) => hook({
    doc: args.doc as never,
    req: args.req as never
  } as never)

  it('queues one workflow for the global carrying all non-default locales', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload })

    await callHook(hook, {
      doc: { updatedAt: '2026-06-22T10:00:00.000Z' },
      req
    })

    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
    expect(payload.jobs.queue).toHaveBeenCalledWith({
      workflow: 'translateEntityToLocales',
      input: {
        updatedAt: '2026-06-22T10:00:00.000Z',
        global: 'header',
        fromLocale: 'en',
        resolver: 'openai',
        toLocales: ['uk', 'de']
      }
    })
  })

  it('does NOT check _status (globals have no versioning)', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload })

    
    await callHook(hook, { doc: { updatedAt: 'now' }, req })

    expect(payload.jobs.queue).toHaveBeenCalled()
  })

  it('skips when not default locale', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'uk', payload })

    await callHook(hook, { doc: { updatedAt: 'now' }, req })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('skips when no user', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload, user: null })

    await callHook(hook, { doc: { updatedAt: 'now' }, req })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('respects context.disableAutoTranslate', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload, context: { disableAutoTranslate: true } })

    await callHook(hook, { doc: { updatedAt: 'now' }, req })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })

  it('logs an error and bails when no resolvers are configured', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload, resolvers: [] })

    await callHook(hook, { doc: { updatedAt: 'now' }, req })

    expect(payload.jobs.queue).not.toHaveBeenCalled()
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('no resolver key available') })
    )
  })

  it('returns the doc unchanged', async () => {
    const hook = createAutoTranslateGlobalHook({ globalSlug: 'header' })
    const req = buildReq({ locale: 'en', payload })
    const doc = { title: 'Header' }

    const result = await callHook(hook, { doc, req })

    expect(result).toBe(doc)
  })
})