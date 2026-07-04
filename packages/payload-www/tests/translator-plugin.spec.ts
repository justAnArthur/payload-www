import { describe, expect, it } from 'vitest'

import { AUTO_TRANSLATE_MARKER, translator } from '../../../plugins/translate/src'

import { createTranslateTask } from '../../../plugins/translate/src/jobs/createTranslateTask'
import { createTranslateWorkflow } from '../../../plugins/translate/src/jobs/createTranslateWorkflow'

const copyResolver = () => ({ key: 'copy', resolve: () => ({ translatedData: {}, success: true }) })

type TestConfig = Parameters<ReturnType<typeof translator>>[0]

function buildBaseConfig(overrides: Partial<TestConfig> = {}): TestConfig {
  return {
    collections: [{ slug: 'pages', fields: [] }, { slug: 'posts', fields: [] }, { slug: 'media', fields: [] }] as never,
    globals: [{ slug: 'header' }, { slug: 'footer' }] as never,
    localization: {
      defaultLocale: 'en',
      locales: ['en', 'uk', 'de']
    },
    ...overrides
  } as TestConfig
}

describe('translator() — autoTranslate off (default)', () => {
  it('leaves config.jobs untouched when autoTranslate is not set', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()]
    } as never)

    const base = buildBaseConfig()
    const configWithJobs = {
      ...base,
      jobs: { tasks: [{ slug: 'existingTask' }], workflows: [{ slug: 'existingWorkflow' }] }
    } as TestConfig
    const result = plugin(configWithJobs) as TestConfig

    expect((result.jobs?.tasks ?? []).map((t) => t.slug)).toEqual(['existingTask'])
    expect((result.jobs?.workflows ?? []).map((w) => w.slug)).toEqual(['existingWorkflow'])
  })

  it('does not attach afterChange hooks when autoTranslate is not set', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()]
    } as never)

    const base = buildBaseConfig()
    const result = plugin(base) as typeof base

    const pages = result.collections?.find((c) => c.slug === 'pages')
    expect(pages?.hooks?.afterChange).toBeUndefined()

    const header = result.globals?.find((g) => g.slug === 'header')
    expect(header?.hooks?.afterChange).toBeUndefined()
  })

  it('does not register jobs when autoTranslate is explicitly false', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: false
    } as never)

    const result = plugin(buildBaseConfig()) as TestConfig
    expect(result.jobs?.tasks).toBeUndefined()
    expect(result.jobs?.workflows).toBeUndefined()
  })
})

describe('translator() — autoTranslate on', () => {
  it('registers the task + workflow in config.jobs', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const result = plugin(buildBaseConfig()) as TestConfig

    const taskSlugs = (result.jobs?.tasks ?? []).map((t) => t.slug)
    const workflowSlugs = (result.jobs?.workflows ?? []).map((w) => w.slug)

    expect(taskSlugs).toContain('translateEntityToLocale')
    expect(workflowSlugs).toContain('translateEntityToLocales')
  })

  it('attaches afterChange hook to every collection in `collections`', () => {
    const plugin = translator({
      collections: ['pages', 'posts'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const result = plugin(buildBaseConfig()) as TestConfig

    const pages = result.collections?.find((c) => c.slug === 'pages')
    const posts = result.collections?.find((c) => c.slug === 'posts')
    const media = result.collections?.find((c) => c.slug === 'media')

    expect(Array.isArray(pages?.hooks?.afterChange)).toBe(true)
    expect((pages?.hooks?.afterChange as unknown[]).length).toBeGreaterThan(0)

    expect(Array.isArray(posts?.hooks?.afterChange)).toBe(true)
    expect((posts?.hooks?.afterChange as unknown[]).length).toBeGreaterThan(0)

    
    expect(media?.hooks?.afterChange).toBeUndefined()
  })

  it('attaches afterChange hook to every global in `globals`', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header', 'footer'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const result = plugin(buildBaseConfig()) as TestConfig

    const header = result.globals?.find((g) => g.slug === 'header')
    const footer = result.globals?.find((g) => g.slug === 'footer')

    expect(Array.isArray(header?.hooks?.afterChange)).toBe(true)
    expect((header?.hooks?.afterChange as unknown[]).length).toBeGreaterThan(0)
    expect(Array.isArray(footer?.hooks?.afterChange)).toBe(true)
    expect((footer?.hooks?.afterChange as unknown[]).length).toBeGreaterThan(0)
  })

  it('marks attached hooks with AUTO_TRANSLATE_MARKER for idempotency', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const result = plugin(buildBaseConfig()) as TestConfig

    const pages = result.collections?.find((c) => c.slug === 'pages') as { hooks?: { afterChange?: unknown[] } } | undefined
    const header = result.globals?.find((g) => g.slug === 'header') as { hooks?: { afterChange?: unknown[] } } | undefined

    const pagesHooks = pages?.hooks?.afterChange ?? []
    const headerHooks = header?.hooks?.afterChange ?? []

    expect(pagesHooks.length).toBeGreaterThan(0)
    expect(headerHooks.length).toBeGreaterThan(0)

    
    for (const h of pagesHooks) expect((h as Record<symbol, unknown>)[AUTO_TRANSLATE_MARKER]).toBe(true)
    for (const h of headerHooks) expect((h as Record<symbol, unknown>)[AUTO_TRANSLATE_MARKER]).toBe(true)
  })

  it('does NOT double-attach when translator() is called twice on the same config', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const once = plugin(buildBaseConfig()) as TestConfig
    const twice = plugin(once) as TestConfig

    const pagesHooks = (twice.collections?.find((c) => c.slug === 'pages') as { hooks?: { afterChange?: unknown[] } } | undefined)?.hooks?.afterChange ?? []
    const headerHooks = (twice.globals?.find((g) => g.slug === 'header') as { hooks?: { afterChange?: unknown[] } } | undefined)?.hooks?.afterChange ?? []

    expect(pagesHooks.length).toBe(1)
    expect(headerHooks.length).toBe(1)
  })

  it('preserves host-prepended afterChange hooks (does not clobber)', () => {
    const hostHook = () => {}

    const base = buildBaseConfig()
    base.collections = base.collections?.map((c) =>
      c.slug === 'pages' ? ({ ...c, hooks: { afterChange: [hostHook] } } as never) : c
    )

    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)
    const result = plugin(base) as TestConfig

    const pagesHooks = (result.collections?.find((c) => c.slug === 'pages') as { hooks?: { afterChange?: unknown[] } } | undefined)?.hooks?.afterChange ?? []
    expect(pagesHooks).toContain(hostHook)
    expect(pagesHooks.length).toBe(2)
  })

  it('does not duplicate jobs when host already registered a task/workflow with the same slug', () => {
    const existingTask = { slug: 'translateEntityToLocale', handler: () => {} }
    const existingWorkflow = { slug: 'translateEntityToLocales', handler: () => {} }

    const base = buildBaseConfig()
    base.jobs = {
      tasks: [existingTask] as never,
      workflows: [existingWorkflow] as never
    } as never

    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)
    const result = plugin(base) as TestConfig

    const tasks = result.jobs?.tasks ?? []
    const workflows = result.jobs?.workflows ?? []

    const translateTasks = tasks.filter((t) => t.slug === 'translateEntityToLocale')
    const translateWorkflows = workflows.filter((w) => w.slug === 'translateEntityToLocales')

    expect(translateTasks).toHaveLength(1)
    expect(translateWorkflows).toHaveLength(1)
    
    expect(translateTasks[0]).toBe(existingTask)
    expect(translateWorkflows[0]).toBe(existingWorkflow)
  })

  it('registered task + workflow are the same shape as the public factories', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)
    const result = plugin(buildBaseConfig()) as TestConfig

    const registeredTask = (result.jobs?.tasks ?? []).find((t) => t.slug === 'translateEntityToLocale')
    const registeredWorkflow = (result.jobs?.workflows ?? []).find((w) => w.slug === 'translateEntityToLocales')

    expect(registeredTask?.slug).toBe(createTranslateTask().slug)
    expect(registeredWorkflow?.slug).toBe(createTranslateWorkflow().slug)
  })

  it('does not register anything when there is only one locale', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true
    } as never)

    const base = buildBaseConfig()
    base.localization = { defaultLocale: 'en', locales: ['en'] } as never
    const result = plugin(base) as TestConfig

    expect(result.jobs?.tasks).toBeUndefined()
    expect(result.jobs?.workflows).toBeUndefined()
    const pages = result.collections?.find((c) => c.slug === 'pages')
    expect(pages?.hooks?.afterChange).toBeUndefined()
  })

  it('does nothing when pluginConfig.disabled is true even with autoTranslate', () => {
    const plugin = translator({
      collections: ['pages'],
      globals: ['header'],
      resolvers: [copyResolver()],
      autoTranslate: true,
      disabled: true
    } as never)

    const base = buildBaseConfig()
    const result = plugin(base) as TestConfig

    
    expect(result).toBe(base)
  })
})
