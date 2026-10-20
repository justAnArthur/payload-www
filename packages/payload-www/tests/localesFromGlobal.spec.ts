import { describe, expect, it, vi } from 'vitest'

const queryGlobal = vi.fn()
vi.mock('../src/render/metadata/query', () => ({ queryGlobal }))

const { localesFromGlobal } = await import('../src/render/metadata/locales')

const routing = { locales: ['en', 'sk', 'cs'], defaultLocale: 'en', localePrefix: 'as-needed' } as never

describe('localesFromGlobal', () => {
  it('reads the enabled locales and default from the global through the cached getter', async () => {
    queryGlobal.mockResolvedValueOnce({ enabledLocales: ['sk', 'en'], defaultLocale: 'sk' })

    expect(await localesFromGlobal({ globalSlug: 'site' })(routing)).toEqual({ locales: ['sk', 'en'], defaultLocale: 'sk' })
    expect(queryGlobal).toHaveBeenLastCalledWith({ globalSlug: 'site', locale: 'en', depth: 0 })
  })

  it('reads custom field names', async () => {
    queryGlobal.mockResolvedValueOnce({ langs: ['cs'], mainLang: 'cs' })

    expect(await localesFromGlobal({ globalSlug: 'settings', localesField: 'langs', defaultLocaleField: 'mainLang' })(routing))
      .toEqual({ locales: ['cs'], defaultLocale: 'cs' })
  })

  it('yields nothing usable for a missing global, so the static routing stays', async () => {
    queryGlobal.mockResolvedValueOnce(null)

    expect(await localesFromGlobal({ globalSlug: 'site' })(routing)).toEqual({ locales: null, defaultLocale: null })
  })
})
