import { beforeEach, describe, expect, it, vi } from 'vitest'









const translateOperationMock = vi.fn()

vi.mock('../../../plugins/translate/src/translate/operation', () => ({
  translateOperation: (...args: unknown[]) => translateOperationMock(...args)
}))

import {
  TRANSLATE_TASK_SLUG,
  TRANSLATE_WORKFLOW_SLUG,
  createTranslateTask,
  createTranslateWorkflow
} from '../../../plugins/translate/src/jobs'

type MockLogger = { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> }
type MockPayload = {
  update: ReturnType<typeof vi.fn>
  updateGlobal: ReturnType<typeof vi.fn>
  logger: MockLogger
}

function mockPayload(): MockPayload {
  return {
    update: vi.fn().mockResolvedValue({}),
    updateGlobal: vi.fn().mockResolvedValue({}),
    logger: { error: vi.fn(), info: vi.fn() }
  }
}

function buildTaskReq(payload: MockPayload, opts: { localization?: unknown } = {}) {
  const config: { localization: unknown } = {
    localization:
      'localization' in opts ? opts.localization : { defaultLocale: 'en', locales: ['en', 'uk'] }
  }
  return {
    payload: {
      ...payload,
      config
    }
  } as never
}



describe('createTranslateTask', () => {
  let payload: MockPayload
  beforeEach(() => {
    payload = mockPayload()
    translateOperationMock.mockReset()
  })

  it('exports the canonical task slug', () => {
    expect(TRANSLATE_TASK_SLUG).toBe('translateEntityToLocale')
  })

  it('calls translateOperation with the right resolver + locale pair', async () => {
    translateOperationMock.mockResolvedValue({
      success: true,
      translatedData: { title: 'Привіт' },
      dataFrom: { title: 'Hello' }
    })

    const task = createTranslateTask({ resolverKey: 'openai' })
    await task.handler({
      input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
      job: { id: 'job-1' } as never,
      req: buildTaskReq(payload)
    } as never)

    expect(translateOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionSlug: 'pages',
        globalSlug: undefined,
        id: 7,
        locale: 'uk',
        localeFrom: 'en',
        resolver: 'openai',
        update: false,
        overrideAccess: true,
        emptyOnly: false
      })
    )
  })

  it('persists translated data via req.payload.update for collections', async () => {
    translateOperationMock.mockResolvedValue({
      success: true,
      translatedData: { title: 'Привіт', body: 'Тіло' }
    })

    const task = createTranslateTask({ resolverKey: 'openai' })
    await task.handler({
      input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
      job: { id: 'job-1' } as never,
      req: buildTaskReq(payload)
    } as never)

    expect(payload.update).toHaveBeenCalledWith({
      collection: 'pages',
      data: { title: 'Привіт', body: 'Тіло' },
      id: 7,
      locale: 'uk',
      overrideAccess: true,
      req: expect.anything()
    })
    expect(payload.updateGlobal).not.toHaveBeenCalled()
  })

  it('persists translated data via req.payload.updateGlobal for globals', async () => {
    translateOperationMock.mockResolvedValue({
      success: true,
      translatedData: { navTitle: 'Меню' }
    })

    const task = createTranslateTask({ resolverKey: 'openai' })
    await task.handler({
      input: { global: 'header', fromLocale: 'en', toLocale: 'uk' },
      job: { id: 'job-1' } as never,
      req: buildTaskReq(payload)
    } as never)

    expect(payload.updateGlobal).toHaveBeenCalledWith({
      slug: 'header',
      data: { navTitle: 'Меню' },
      locale: 'uk',
      overrideAccess: true,
      req: expect.anything()
    })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('strips synthetic _locale and _parent_id from translated data', async () => {
    translateOperationMock.mockResolvedValue({
      success: true,
      translatedData: {
        title: 'Привіт',
        _locale: 'uk',
        _parent_id: 7
      }
    })

    const task = createTranslateTask({ resolverKey: 'openai' })
    await task.handler({
      input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
      job: { id: 'job-1' } as never,
      req: buildTaskReq(payload)
    } as never)

    const updateArgs = payload.update.mock.calls[0][0]
    expect(updateArgs.data).toEqual({ title: 'Привіт' })
    expect(updateArgs.data).not.toHaveProperty('_locale')
    expect(updateArgs.data).not.toHaveProperty('_parent_id')
  })

  it('throws when neither collection nor global is provided', async () => {
    const task = createTranslateTask({ resolverKey: 'openai' })
    await expect(
      task.handler({
        input: { fromLocale: 'en', toLocale: 'uk' },
        job: { id: 'job-1' } as never,
        req: buildTaskReq(payload)
      } as never)
    ).rejects.toThrow(/either `collection` or `global`/)
  })

  it('throws when resolver returns success=false (triggers retry)', async () => {
    translateOperationMock.mockResolvedValue({ success: false })

    const task = createTranslateTask({ resolverKey: 'openai' })
    await expect(
      task.handler({
        input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
        job: { id: 'job-1' } as never,
        req: buildTaskReq(payload)
      } as never)
    ).rejects.toThrow(/success=false/)

    expect(payload.update).not.toHaveBeenCalled()
  })

  it('propagates translateOperation throws (triggers retry)', async () => {
    translateOperationMock.mockRejectedValue(new Error('resolver down'))

    const task = createTranslateTask({ resolverKey: 'openai' })
    await expect(
      task.handler({
        input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
        job: { id: 'job-1' } as never,
        req: buildTaskReq(payload)
      } as never)
    ).rejects.toThrow(/resolver down/)
  })

  it('propagates persist throws (triggers retry)', async () => {
    translateOperationMock.mockResolvedValue({ success: true, translatedData: { title: 'ok' } })
    payload.update.mockRejectedValue(new Error('db down'))

    const task = createTranslateTask({ resolverKey: 'openai' })
    await expect(
      task.handler({
        input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
        job: { id: 'job-1' } as never,
        req: buildTaskReq(payload)
      } as never)
    ).rejects.toThrow(/db down/)
  })

  it('honours a custom slug', async () => {
    translateOperationMock.mockResolvedValue({ success: true, translatedData: {} })
    const task = createTranslateTask({ resolverKey: 'openai', slug: 'customTask' })
    expect(task.slug).toBe('customTask')
  })

  it('falls back to the input resolver when no resolverKey is configured', async () => {
    translateOperationMock.mockResolvedValue({ success: true, translatedData: {} })

    const task = createTranslateTask() 
    await task.handler({
      input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk', resolver: 'queued-key' },
      job: { id: 'job-1' } as never,
      req: buildTaskReq(payload)
    } as never)

    expect(translateOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({ resolver: 'queued-key' })
    )
  })

  it('falls back to the first configured resolver key as a last resort', async () => {
    translateOperationMock.mockResolvedValue({ success: true, translatedData: {} })

    const task = createTranslateTask() 
    await task.handler({
      input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
      job: { id: 'job-1' } as never,
      req: {
        payload: {
          ...payload,
          config: {
            localization: { defaultLocale: 'en', locales: ['en', 'uk'] },
            custom: { translator: { resolvers: [{ key: 'openai' }, { key: 'google' }] } }
          }
        }
      } as never
    } as never)

    expect(translateOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({ resolver: 'openai' })
    )
  })

  it('throws when no resolver key is available anywhere', async () => {
    translateOperationMock.mockResolvedValue({ success: true, translatedData: {} })

    const task = createTranslateTask()
    await expect(
      task.handler({
        input: { id: 7, collection: 'pages', fromLocale: 'en', toLocale: 'uk' },
        job: { id: 'job-1' } as never,
        req: {
          payload: {
            ...payload,
            config: {
              localization: { defaultLocale: 'en', locales: ['en', 'uk'] }
            }
          }
        }
      } as never)
    ).rejects.toThrow(/no resolver key available/)
  })
})



describe('createTranslateWorkflow', () => {
  let payload: MockPayload
  beforeEach(() => {
    payload = mockPayload()
  })

  it('exports the canonical workflow slug', () => {
    expect(TRANSLATE_WORKFLOW_SLUG).toBe('translateEntityToLocales')
  })

  it('schedules the per-locale task with a stable dedupe key', async () => {
    const taskQueueFn = vi.fn().mockResolvedValue({ id: 'task-1' })

    const workflow = createTranslateWorkflow()
    await workflow.handler({
      job: {
        id: 'job-1',
        input: {
          id: 7,
          updatedAt: '2026-06-22T10:00:00.000Z',
          collection: 'pages',
          fromLocale: 'en',
          toLocale: 'uk'
        }
      },
      req: buildTaskReq(payload),
      tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
    } as never)

    expect(taskQueueFn).toHaveBeenCalledTimes(1)
    expect(taskQueueFn).toHaveBeenCalledWith(
      'pages-7-en-uk-2026-06-22T10:00:00.000Z',
      {
        input: {
          id: 7,
          collection: 'pages',
          global: undefined,
          fromLocale: 'en',
          resolver: undefined,
          toLocale: 'uk'
        }
      }
    )
  })

  it('uses the slug for globals in the dedupe key', async () => {
    const taskQueueFn = vi.fn().mockResolvedValue({ id: 'task-1' })

    const workflow = createTranslateWorkflow()
    await workflow.handler({
      job: {
        id: 'job-1',
        input: {
          updatedAt: '2026-06-22T10:00:00.000Z',
          global: 'header',
          fromLocale: 'en',
          toLocale: 'uk'
        }
      },
      req: buildTaskReq(payload),
      tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
    } as never)

    expect(taskQueueFn).toHaveBeenCalledWith(
      'header-en-uk-2026-06-22T10:00:00.000Z',
      expect.objectContaining({ input: expect.objectContaining({ global: 'header' }) })
    )
  })

  it('forwards the resolver input through to the per-locale task', async () => {
    const taskQueueFn = vi.fn().mockResolvedValue({ id: 'task-1' })

    const workflow = createTranslateWorkflow()
    await workflow.handler({
      job: {
        id: 'job-1',
        input: {
          id: 7,
          updatedAt: '2026-06-22T10:00:00.000Z',
          collection: 'pages',
          fromLocale: 'en',
          toLocale: 'uk',
          resolver: 'openai'
        }
      },
      req: buildTaskReq(payload),
      tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
    } as never)

    expect(taskQueueFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ input: expect.objectContaining({ resolver: 'openai' }) })
    )
  })

  it('converts Date to ISO in the dedupe key', async () => {
    const taskQueueFn = vi.fn().mockResolvedValue({ id: 'task-1' })
    const date = new Date('2026-06-22T10:00:00.000Z')

    const workflow = createTranslateWorkflow()
    await workflow.handler({
      job: {
        id: 'job-1',
        input: {
          id: 7,
          updatedAt: date,
          collection: 'pages',
          fromLocale: 'en',
          toLocale: 'uk'
        }
      },
      req: buildTaskReq(payload),
      tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
    } as never)

    expect(taskQueueFn).toHaveBeenCalledWith(
      `pages-7-en-uk-${date.toISOString()}`,
      expect.anything()
    )
  })

  it('throws when neither collection nor global is provided', async () => {
    const taskQueueFn = vi.fn()
    const workflow = createTranslateWorkflow()

    await expect(
      workflow.handler({
        job: {
          id: 'job-1',
          input: {
            updatedAt: '2026-06-22T10:00:00.000Z',
            fromLocale: 'en',
            toLocale: 'uk'
          }
        },
        req: buildTaskReq(payload),
        tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
      } as never)
    ).rejects.toThrow(/either `collection` or `global`/)
  })

  it('no-ops when localization is not configured (logs and returns)', async () => {
    const taskQueueFn = vi.fn()
    const workflow = createTranslateWorkflow()

    await workflow.handler({
      job: {
        id: 'job-1',
        input: {
          id: 7,
          updatedAt: '2026-06-22T10:00:00.000Z',
          collection: 'pages',
          fromLocale: 'en',
          toLocale: 'uk'
        }
      },
      req: buildTaskReq(payload, { localization: undefined }),
      tasks: { [TRANSLATE_TASK_SLUG]: taskQueueFn }
    } as never)

    expect(taskQueueFn).not.toHaveBeenCalled()
    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining('localization is not enabled') })
    )
  })

  it('honours a custom workflow + task slug', () => {
    const workflow = createTranslateWorkflow({
      slug: 'myWorkflow',
      taskSlug: 'myTask'
    })
    expect(workflow.slug).toBe('myWorkflow')
  })
})
