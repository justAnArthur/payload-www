import { describe, expect, it } from 'vitest'

import { slugToPath } from '../src/render/metadata/slug'
import {
  buildAlternates,
  buildLocalizedPath,
  buildLocalizedPaths,
  type RoutingConfig
} from '../src/render/pages/utils/buildLocalizedPath'

const routing = {
  locales: ['en', 'sk', 'cs'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
} as unknown as RoutingConfig

const siteUrl = 'https://www.camasys.com'

describe('metadata/slugToPath', () => {
  it('turns the nesting divider into path separators', () => {
    expect(slugToPath('products_self-service-portal')).toBe('products/self-service-portal')
    expect(slugToPath('a_b_c')).toBe('a/b/c')
  })

  it('leaves a flat slug and empty input alone', () => {
    expect(slugToPath('pricing')).toBe('pricing')
    expect(slugToPath('')).toBe('')
    expect(slugToPath(undefined)).toBe('')
  })
})

describe('buildLocalizedPath', () => {
  it('splits a nested slug instead of emitting the stored form', () => {
    expect(buildLocalizedPath('en', undefined, 'products_online-reservations', { routing }))
      .toBe('/products/online-reservations')
    expect(buildLocalizedPath('sk', undefined, 'produkty_samoobsluzny-portal', { routing }))
      .toBe('/sk/produkty/samoobsluzny-portal')
  })

  it('omits the prefix for the default locale under as-needed', () => {
    expect(buildLocalizedPath('en', undefined, 'pricing', { routing })).toBe('/pricing')
    expect(buildLocalizedPath('cs', undefined, 'ceny', { routing })).toBe('/cs/ceny')
  })

  it('keeps the collection prefix ahead of the slug', () => {
    expect(buildLocalizedPath('cs', 'posts', 'nejaky-clanek', { routing }))
      .toBe('/cs/posts/nejaky-clanek')
  })

  it('yields the bare locale root for a blank slug', () => {
    expect(buildLocalizedPath('en', undefined, '', { routing })).toBe('')
    expect(buildLocalizedPath('cs', undefined, '', { routing })).toBe('/cs')
  })
})

describe('buildLocalizedPaths', () => {
  it('drops locales the doc is not translated into', () => {
    const paths = buildLocalizedPaths({ en: 'some-post', sk: '' }, 'posts', { routing })

    // without the guard sk collapsed onto the collection listing url
    expect(paths).toEqual({ en: '/posts/some-post' })
    expect(paths.sk).toBeUndefined()
    expect(paths.cs).toBeUndefined()
  })

  it('keeps every locale on the home page, where a blank slug is legitimate', () => {
    const paths = buildLocalizedPaths({ en: '', sk: '', cs: '' }, undefined, { routing })

    expect(paths).toEqual({ en: '', sk: '/sk', cs: '/cs' })
  })
})

describe('buildAlternates', () => {
  it('builds absolute urls with x-default pinned to the default locale', () => {
    const { languages, canonical } = buildAlternates(
      'cs', { en: 'about_us', sk: 'o_nas', cs: 'o_nas-cs' }, undefined, { routing, siteUrl }
    )

    expect(canonical).toBe('https://www.camasys.com/cs/o/nas-cs')
    expect(languages).toEqual({
      en: 'https://www.camasys.com/about/us',
      sk: 'https://www.camasys.com/sk/o/nas',
      cs: 'https://www.camasys.com/cs/o/nas-cs',
      'x-default': 'https://www.camasys.com/about/us'
    })
  })

  it('emits no alternate for an untranslated locale but still a canonical', () => {
    const { languages, canonical } = buildAlternates(
      'sk', { en: 'some-post', sk: '' }, 'posts', { routing, siteUrl }
    )

    expect(canonical).toBe('https://www.camasys.com/sk/posts')
    expect(languages.sk).toBeUndefined()
    expect(languages.en).toBe('https://www.camasys.com/posts/some-post')
  })

  it('canonicalises the home page to the bare site url', () => {
    const { canonical, languages } = buildAlternates(
      'en', { en: '', sk: '', cs: '' }, undefined, { routing, siteUrl }
    )

    expect(canonical).toBe('https://www.camasys.com')
    expect(languages.cs).toBe('https://www.camasys.com/cs')
  })
})
