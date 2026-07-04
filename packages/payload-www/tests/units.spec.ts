import { describe, expect, it } from 'vitest'

import { anyone, authenticated, authenticatedOrPublished } from '../src/collections/access'
import { createFooterGlobal } from '../src/collections/createFooterGlobal'
import { createHeaderGlobal } from '../src/collections/createHeaderGlobal'
import { createPagesCollection, PAGES_SLUG, PAGES_RENDER_PATH } from '../src/collections/createPagesCollection'
import { createPostsCollection, POSTS_SLUG, POSTS_RENDER_PATH } from '../src/collections/createPostsCollection'
import { appearanceOptions, link, type LinkAppearances } from '../src/collections/fields/link'
import { linkGroup } from '../src/collections/fields/linkGroup'
import { slugField } from '../src/collections/fields/slug'
import { createWWWConfig } from '../src/createWWWConfig'
import { generateImportName } from '../src/render/generateImportName'
import { getFromImportMap } from '../src/render/getFromImportMap'
import { buildArticleLd, buildBreadcrumbsLd, buildOrganizationLd } from '../src/render/metadata/jsonld'
import { paramsSlugToSlug, slugToParamsSlug } from '../src/render/metadata/slug'

import { link as linkFromShim, linkGroup as linkGroupFromShim, appearanceOptions as appearanceOptionsFromShim } from '../src/exports/fields'
import { anyone as anyoneFromShim } from '../src/exports/access'
import { buildArticleLd as articleFromShim, paramsSlugToSlug as segFromShim } from '../src/exports/metadata'
import { getFromImportMap as gimFromShim } from '../src/exports/utils'
import { createWWWConfig as createWWWConfigFromShim } from '../src/exports/config'

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

function findField(group: { fields?: unknown[]; tabs?: unknown[] }, name: string): any {
  const walk = (f: { name?: string; type?: string; fields?: unknown[]; tabs?: unknown[] }): any => {
    if (f.name === name) return f
    if (Array.isArray(f.fields)) {
      for (const child of f.fields) {
        const found = walk(child as any)
        if (found) return found
      }
    }
    if (Array.isArray((f as any).tabs)) {
      for (const tab of (f as any).tabs) {
        const found = walk(tab as any)
        if (found) return found
      }
    }
    return null
  }
  return walk(group as any)
}

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

  it('marks fields as localized by default and can opt out', () => {
    const def = findField(link() as any, 'reference')
    expect(def.localized).toBe(true)
    const opt = findField(link({ localized: false }) as any, 'reference')
    expect(opt.localized).toBe(false)
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

  it('respects appearances array override', () => {
    const f = link({ appearances: ['default'] }) as any
    const appearance = findField(f, 'appearance')
    expect(appearance.options).toEqual([appearanceOptions.default])
  })

  it('defaults relationTo to [pages, posts] slugs', () => {
    const ref = findField(link() as any, 'reference')
    expect(ref.relationTo).toEqual([PAGES_SLUG, POSTS_SLUG])
  })

  it('shim re-exports match src exports', () => {
    expect(linkFromShim).toBe(link)
    expect(linkGroupFromShim).toBe(linkGroup)
    expect(appearanceOptionsFromShim).toBe(appearanceOptions)
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

  it('forwards link options through to the inner link', () => {
    const g = linkGroup({ appearances: false }) as any
    expect(flattenNames(g)).not.toContain('appearance')
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

  it('is localized by default', () => {
    expect((slugField() as any).localized).toBe(true)
  })

  it('rejects invalid characters (uppercase, spaces, special chars)', () => {
    const validate = (slugField() as any).validate as (v: unknown) => true | string
    expect(validate('about-us')).toBe(true)
    expect(validate('about_us')).toBe(true)
    expect(validate('')).toBe(true)
    expect(validate('About Us')).not.toBe(true)
    expect(validate('about us')).not.toBe(true)
    expect(validate('about@us')).not.toBe(true)
  })
})

describe('fields/appearanceOptions', () => {
  it('exposes the two standard appearances', () => {
    expect(Object.keys(appearanceOptions).sort()).toEqual(['default', 'outline'])
  })

  it('LinkAppearances is the union of the two keys', () => {
    const keys: LinkAppearances[] = ['default', 'outline']
    for (const k of keys) expect(appearanceOptions[k].value).toBe(k)
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

describe('collections/createHeaderGlobal', () => {
  it('produces a GlobalConfig with header slug', () => {
    const header = createHeaderGlobal() as any
    expect(header.slug).toBe('header')
  })

  it('exposes nav block with navItem and navColumn', () => {
    const header = createHeaderGlobal() as any
    const nav = header.fields[2]
    expect(nav.type).toBe('blocks')
    const slugs = nav.blocks.map((b: { slug: string }) => b.slug).sort()
    expect(slugs).toEqual(['navColumn', 'navItem'])
  })
})

describe('collections/createFooterGlobal', () => {
  it('produces a GlobalConfig with footer slug', () => {
    const footer = createFooterGlobal() as any
    expect(footer.slug).toBe('footer')
  })
})

describe('collections/createPagesCollection', () => {
  it('exposes PAGES_SLUG constant', () => {
    expect(PAGES_SLUG).toBe('pages')
  })

  it('exposes PAGES_RENDER_PATH pointing at the render-pages entry', () => {
    expect(PAGES_RENDER_PATH).toBe('@justanarthur/payload-www/render-pages#PagesPage')
  })

  it('produces a CollectionConfig with the right slug', () => {
    const pages = createPagesCollection([]) as any
    expect(pages.slug).toBe(PAGES_SLUG)
  })

  it('includes a localized title field and a blocks field', () => {
    const pages = createPagesCollection([]) as any
    const title = findField(pages, 'title')
    expect(title).toBeTruthy()
    expect(title.localized).toBe(true)
    const blocks = findField(pages, 'blocks')
    expect(blocks).toBeTruthy()
    expect(blocks.type).toBe('blocks')
  })
})

describe('collections/createPostsCollection', () => {
  it('exposes POSTS_SLUG constant', () => {
    expect(POSTS_SLUG).toBe('posts')
  })

  it('exposes POSTS_RENDER_PATH pointing at the render-pages entry', () => {
    expect(POSTS_RENDER_PATH).toBe('@justanarthur/payload-www/render-pages#PostsPage')
  })

  it('produces a CollectionConfig with the right slug', () => {
    const posts = createPostsCollection() as any
    expect(posts.slug).toBe(POSTS_SLUG)
  })
})

describe('createWWWConfig', () => {
  it('returns an object with a withWWWConfig function', () => {
    const api = createWWWConfig()
    expect(typeof api.withWWWConfig).toBe('function')
  })

  it('withWWWConfig builds a config with pages + posts collections and header + footer globals', async () => {
    const { withWWWConfig } = createWWWConfig()
    const cfg = await withWWWConfig({
      collections: [],
      globals: []
    } as never)

    const collectionSlugs = (cfg.collections ?? []).map((c: { slug: string }) => c.slug).sort()
    expect(collectionSlugs).toContain(PAGES_SLUG)
    expect(collectionSlugs).toContain(POSTS_SLUG)

    const globalSlugs = (cfg.globals ?? []).map((g: { slug: string }) => g.slug).sort()
    expect(globalSlugs).toContain('header')
    expect(globalSlugs).toContain('footer')
  })

  it('shim re-export matches src', () => {
    expect(createWWWConfigFromShim).toBe(createWWWConfig)
  })
})

describe('metadata/slug', () => {
  it('paramsSlugToSlug joins an array of segments with _', () => {
    expect(paramsSlugToSlug(['a', 'b', 'c'])).toBe('a_b_c')
  })

  it('paramsSlugToSlug passes a string through unchanged', () => {
    expect(paramsSlugToSlug('hello')).toBe('hello')
  })

  it('paramsSlugToSlug returns empty for empty input', () => {
    expect(paramsSlugToSlug([])).toBe('')
    expect(paramsSlugToSlug('')).toBe('')
  })

  it('slugToParamsSlug splits on _', () => {
    expect(slugToParamsSlug('a_b_c')).toEqual(['a', 'b', 'c'])
  })

  it('slugToParamsSlug returns undefined for empty input', () => {
    expect(slugToParamsSlug('')).toBeUndefined()
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

  it('buildArticleLd respects explicit type override', () => {
    const ld = buildArticleLd({
      doc: { title: 'X' },
      url: 'https://x.com/x',
      locale: 'en',
      siteUrl: 'https://x.com',
      type: 'NewsArticle'
    })
    expect(ld['@type']).toBe('NewsArticle')
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

  it('buildOrganizationLd omits name when not provided', () => {
    const ld = buildOrganizationLd({ siteUrl: 'https://x.com' })
    expect((ld as any).name).toBeUndefined()
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
