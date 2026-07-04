import { describe, expect, it } from 'vitest'

import { appearanceOptions, link, linkGroup, slugField } from '../src/collections/fields'
import { anyone, authenticated, authenticatedOrPublished } from '../src/collections/access'
import { createHeaderGlobal } from '../src/collections/globals/Header/config'
import { createFooterGlobal } from '../src/collections/globals/Footer/config'
import { createPagesCollection } from '../src/collections/Pages/index'
import {
  buildArticleLd,
  buildBreadcrumbsLd,
  buildCanonicalUrl,
  buildOrganizationLd,
  getUrlPath,
  paramsSlugToSlug,
  segmentsToUrlPath,
  slugToParamsSlug
} from '../src/render/metadata'
import { generateImportName, getFromImportMap } from '../src/core/utils'
import { link as linkFromShim, linkGroup as linkGroupFromShim } from '../src/exports/fields'
import { anyone as anyoneFromShim } from '../src/exports/access'
import { buildArticleLd as articleFromShim, paramsSlugToSlug as segFromShim } from '../src/exports/metadata'
import { getFromImportMap as gimFromShim } from '../src/exports/utils'

describe('fields/link', () => {
  it('produces a group with type/newTab/reference/url/label/appearance', () => {
    const f = link() as any
    const names = flattenNames(f)
    expect(names).toContain('type')
    expect(names).toContain('newTab')
    expect(names).toContain('reference')
    expect(names).toContain('url')
    expect(names).toContain('label')
    expect(names).toContain('appearance')
  })

  it('drops appearance when disabled', () => {
    const f = link({ appearances: false }) as any
    expect(flattenNames(f)).not.toContain('appearance')
  })

  it('drops label when disabled', () => {
    const f = link({ disableLabel: true }) as any
    expect(flattenNames(f)).not.toContain('label')
  })

  it('respects relationTo override', () => {
    const f = link({ relationTo: ['media', 'categories'] }) as any
    const ref = findField(f, 'reference')
    expect(ref.relationTo).toEqual(['media', 'categories'])
  })

  it('marks fields as localized when requested', () => {
    const f = link({ localized: true }) as any
    const ref = findField(f, 'reference')
    expect(ref.localized).toBe(true)
    const url = findField(f, 'url')
    expect(url.localized).toBe(true)
  })

  it('appends extraFields to the link group', () => {
    const f = link({
      extraFields: [
        { name: 'description', type: 'text' },
        { name: 'navHover', type: 'group', fields: [{ name: 'columns', type: 'number' }] }
      ]
    }) as any
    const names = flattenNames(f)
    expect(names).toContain('description')
    expect(names).toContain('navHover')
    expect(names).toContain('columns')
  })

  it('shim re-exports match src exports', () => {
    expect(linkFromShim).toBe(link)
    expect(linkGroupFromShim).toBe(linkGroup)
  })
})

describe('globals/header+footer nav extensibility', () => {
  const extra = [{ name: 'description', type: 'text' as const }]

  it('createHeaderGlobal threads navColumnLinkFields into the column link', () => {
    const header = createHeaderGlobal({ navColumnLinkFields: extra }) as any
    const navColumn = header.fields[0].blocks.find((b: any) => b.slug === 'navColumn')
    expect(flattenNames(navColumn.fields[1])).toContain('description')
  })

  it('createFooterGlobal threads navItemLinkFields into the item link', () => {
    const footer = createFooterGlobal({ navItemLinkFields: extra }) as any
    const navItem = footer.fields[0].blocks.find((b: any) => b.slug === 'navItem')
    expect(flattenNames(navItem)).toContain('description')
  })

  it('omits extra nav fields by default', () => {
    const header = createHeaderGlobal() as any
    const navColumn = header.fields[0].blocks.find((b: any) => b.slug === 'navColumn')
    expect(flattenNames(navColumn.fields[1])).not.toContain('description')
  })
})

describe('fields/slug', () => {
  it('is a required, unique, indexed text field named slug', () => {
    const f = slugField() as any
    expect(f.name).toBe('slug')
    expect(f.type).toBe('text')
    expect(f.required).toBe(true)
    expect(f.unique).toBe(true)
    expect(f.index).toBe(true)
  })

  it('is localized by default, and can opt out', () => {
    expect((slugField() as any).localized).toBe(true)
    expect((slugField({ localized: false }) as any).localized).toBe(false)
  })

  it('flat validation rejects `_`; nested accepts it; empty always allowed', () => {
    const flat = (slugField() as any).validate as (v: unknown) => true | string
    expect(flat('about-us')).toBe(true)
    expect(flat('about_us')).not.toBe(true)
    expect(flat('')).toBe(true)

    const nested = (slugField({ nested: true }) as any).validate as (v: unknown) => true | string
    expect(nested('about_us')).toBe(true)
    expect(nested('About Us')).not.toBe(true)
  })

  it('honors a custom field name', () => {
    expect((slugField({ name: 'path' }) as any).name).toBe('path')
  })
})

describe('collections/Pages slug', () => {
  const slugFieldOf = (opts?: { nested?: boolean }) =>
    findField(createPagesCollection([], opts) as any, 'slug')

  it('localizes the slug by default (per-locale URLs)', () => {
    expect(slugFieldOf().localized).toBe(true)
  })

  it('flat (default) rejects the `_` nesting divider', () => {
    const validate = slugFieldOf().validate as (v: unknown) => true | string
    expect(validate('about-us')).toBe(true)
    expect(validate('about_us')).not.toBe(true)
    expect(validate('')).toBe(true)
  })

  it('nested accepts the `_` nesting divider', () => {
    const validate = slugFieldOf({ nested: true }).validate as (v: unknown) => true | string
    expect(validate('about_us')).toBe(true)
    expect(validate('about-us')).toBe(true)
    expect(validate('')).toBe(true)
    expect(validate('About Us')).not.toBe(true)
  })
})

describe('fields/linkGroup', () => {
  it('produces an array with one link child', () => {
    const g = linkGroup() as any
    expect(g.name).toBe('links')
    expect(g.type).toBe('array')
    expect(g.fields.length).toBe(1)
    expect(g.fields[0].name).toBe('link')
  })
})

describe('fields/appearanceOptions', () => {
  it('exposes the two standard appearances', () => {
    expect(Object.keys(appearanceOptions).sort()).toEqual(['default', 'outline'])
  })
})

describe('access', () => {
  it('anyone() returns true', () => {
    expect(anyone({ req: { user: null } } as never)).toBe(true)
    expect(anyone({ req: { user: { id: 1 } } } as never)).toBe(true)
  })

  it('authenticated() reflects user presence', () => {
    expect(authenticated({ req: { user: null } } as never)).toBe(false)
    expect(authenticated({ req: { user: { id: 1 } } } as never)).toBe(true)
  })

  it('authenticatedOrPublished returns true for any user', () => {
    expect(authenticatedOrPublished({ req: { user: { id: 1 } } } as never)).toBe(true)
  })

  it('authenticatedOrPublished returns _status filter for anonymous', () => {
    expect(authenticatedOrPublished({ req: { user: null } } as never)).toEqual({
      _status: { equals: 'published' }
    })
  })

  it('shim re-export matches src', () => {
    expect(anyoneFromShim).toBe(anyone)
  })
})

describe('metadata/slug', () => {
  it('segmentsToStoredSlug: nested joins with _', () => {
    expect(paramsSlugToSlug(['a', 'b', 'c'], true)).toBe('a_b_c')
  })
  it('segmentsToStoredSlug: flat takes first segment', () => {
    expect(paramsSlugToSlug(['a', 'b'], false)).toBe('a')
  })
  it('segmentsToStoredSlug: non-array passthrough', () => {
    expect(paramsSlugToSlug('hello', true)).toBe('hello')
  })

  it('segmentsToUrlPath: nested joins with /', () => {
    expect(segmentsToUrlPath(['a', 'b', 'c'], true)).toBe('/a/b/c')
  })
  it('segmentsToUrlPath: flat takes first segment', () => {
    expect(segmentsToUrlPath(['a', 'b'], false)).toBe('/a')
  })
  it('segmentsToUrlPath: non-array passthrough', () => {
    expect(segmentsToUrlPath('hello', true)).toBe('/hello')
  })

  it('storedSlugToSegments: nested splits on _', () => {
    expect(slugToParamsSlug('a_b_c', true)).toEqual(['a', 'b', 'c'])
  })
  it('storedSlugToSegments: flat returns as-is', () => {
    expect(slugToParamsSlug('hello', false)).toBe('hello')
  })

  it('buildCanonicalUrl strips trailing slash from prefix', () => {
    expect(
      buildCanonicalUrl({ siteUrl: 'https://x.com', locale: 'en', urlPrefix: '/posts/', urlPath: '/foo' })
    ).toBe('https://x.com/en/posts/foo')
  })
  it('buildCanonicalUrl keeps prefix when no trailing slash', () => {
    expect(
      buildCanonicalUrl({ siteUrl: 'https://x.com', locale: 'en', urlPrefix: '', urlPath: '/foo' })
    ).toBe('https://x.com/en/foo')
  })

  it('getUrlPath collapses home slug to /', () => {

    expect(getUrlPath([], true, '')).toBe('/')
    expect(getUrlPath([''], true, '')).toBe('/')
    expect(getUrlPath('home', true, '')).toBe('/home')
  })
  it('getUrlPath passes through non-home slug', () => {
    expect(getUrlPath(['about', 'us'], true, '')).toBe('/about/us')
  })

  it('shim matches src', () => {
    expect(segFromShim).toBe(paramsSlugToSlug)
  })
})

describe('metadata/jsonld', () => {
  it('buildArticleLd produces schema.org article', () => {
    const ld = buildArticleLd({
      doc: { title: 'Hello', meta: { description: 'world' }, publishedAt: '2024-01-01T00:00:00.000Z' },
      url: 'https://x.com/en/posts/hello',
      locale: 'en',
      siteUrl: 'https://x.com'
    })
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('BlogPosting')
    expect(ld.headline).toBe('Hello')
    expect(ld.inLanguage).toBe('en')
    expect(ld.datePublished).toBe('2024-01-01T00:00:00.000Z')
    expect((ld.publisher as any)['@type']).toBe('Organization')
  })

  it('buildBreadcrumbsLd produces BreadcrumbList with positions', () => {
    const ld = buildBreadcrumbsLd({
      items: [
        { label: 'Home', url: 'https://x.com/' },
        { label: 'Posts', url: 'https://x.com/posts' },
        { label: 'Hello', url: 'https://x.com/posts/hello' }
      ],
      currentUrl: 'https://x.com/posts/hello'
    })
    expect(ld['@type']).toBe('BreadcrumbList')
    expect((ld as any).itemListElement.length).toBe(3)
    expect((ld as any).itemListElement[0].position).toBe(1)

    expect((ld as any).itemListElement[2].item).toBe('https://x.com/posts/hello')
    expect((ld as any).itemListElement[0].item).toBe('https://x.com/')
  })

  it('buildOrganizationLd merges optional fields', () => {
    const ld = buildOrganizationLd({ siteUrl: 'https://x.com', name: 'X' })
    expect(ld['@type']).toBe('Organization')
    expect((ld as any).name).toBe('X')
  })

  it('shim re-export matches src', () => {
    expect(articleFromShim).toBe(buildArticleLd)
  })
})

describe('utils', () => {
  it('generateImportName handles both block and page types', () => {
    expect(generateImportName('block', 'cta')).toBe('BlockCta#default')
    expect(generateImportName('block', 'cta-small')).toBe('BlockCtaSmall#default')
    expect(generateImportName('page', 'home')).toBe('PageHome#default')
    expect(generateImportName('page' as any, 'x')).toBe('PageX#default')
  })

  it('generateImportName throws for unknown type', () => {
    expect(() => generateImportName('x' as never, 'y')).toThrow(/Unknown type/)
  })

  it('getFromImportMap appends #default if missing', () => {
    const map: any = { 'X#default': 'value' }
    expect(getFromImportMap('X', map)).toBe('value')
  })

  it('getFromImportMap respects #default if present', () => {
    const map: any = { 'X#custom': 'custom', 'X#default': 'default' }
    expect(getFromImportMap('X#custom', map)).toBe('custom')
  })

  it('shim re-export matches src', () => {
    expect(gimFromShim).toBe(getFromImportMap)
  })
})



function flattenNames(field: { fields?: unknown[] }): string[] {
  const out: string[] = []
  const walk = (f: { name?: string; type?: string; fields?: unknown[] }) => {
    if (f.name) out.push(f.name)
    if (Array.isArray(f.fields)) {
      for (const child of f.fields) walk(child as { name?: string; type?: string; fields?: unknown[] })
    }
  }
  walk(field as any)
  return out
}

function findField(group: { fields?: unknown[] }, name: string): any {
  const walk = (f: { name?: string; type?: string; fields?: unknown[] }): any => {
    if (f.name === name) return f
    if (Array.isArray(f.fields)) {
      for (const child of f.fields) {
        const found = walk(child as any)
        if (found) return found
      }
    }
    return null
  }
  return walk(group as any)
}
