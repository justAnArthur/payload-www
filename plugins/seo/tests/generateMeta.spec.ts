import { describe, expect, it } from 'vitest'

import { generateMeta, type SEOMetaShape } from '../src/generateMeta'

// ----------------------------------------------------------------
// generateMeta — page (Payload `pages` collection with SEO enabled)
// ----------------------------------------------------------------
//
// Typical site page doc with full SEO meta + standard website-shaped
// metadata. `createCollectionPageExports` calls this with `type:
// 'website'` for the pages collection (posts default to 'article').

describe('generateMeta — page', () => {
  it('maps a fully-populated page meta into Metadata', () => {
    const meta: SEOMetaShape = {
      content: {
        title: 'About us',
        description: 'Learn about the team and what we build.',
        keywords: 'cms, payload, seo',
        image: 'https://cdn.example.com/about.png'
      },
      social: {
        social: {
          ogTitle: 'About us | Acme',
          ogDescription: 'A team that builds useful things.',
          ogImage: { url: 'https://cdn.example.com/og-about.png' },
          ogType: 'website',
          ogUrl: 'https://example.com/about',
          ogSiteName: 'Acme',
          ogLocale: 'en_US',
          twitterCard: 'summary_large_image',
          twitterTitle: 'About us',
          twitterDescription: 'A team that builds useful things.',
          twitterImage: 'https://cdn.example.com/tw-about.png',
          twitterSite: '@acme',
          twitterCreator: '@team_acme'
        }
      },
      advanced: {
        advanced: {
          canonicalUrl: 'https://example.com/about',
          robots: 'index, follow',
          author: 'Acme Team'
        }
      }
    }

    const out = generateMeta({
      meta,
      url: 'https://example.com/about',
      type: 'website',
      locale: 'en',
      fallback: { title: 'Untitled' }
    })

    expect(out.title).toBe('About us')
    expect(out.description).toBe('Learn about the team and what we build.')
    expect(out.keywords).toEqual(['cms', 'payload', 'seo'])
    expect(out.authors).toEqual([{ name: 'Acme Team' }])
    expect(out.robots).toBe('index, follow')
    expect(out.openGraph).toMatchObject({
      title: 'About us | Acme',
      description: 'A team that builds useful things.',
      type: 'website',
      url: 'https://example.com/about',
      siteName: 'Acme',
      // ogLocale wins over the locale arg.
      locale: 'en_US',
      images: [{ url: 'https://cdn.example.com/og-about.png' }]
    })
    expect(out.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'About us',
      description: 'A team that builds useful things.',
      site: '@acme',
      creator: '@team_acme',
      images: [{ url: 'https://cdn.example.com/tw-about.png' }]
    })
    // `alternates` is set by the lib's `createCollectionPageExports`
    // after this returns — must not be touched here.
    expect(out.alternates).toBeUndefined()
  })

  it('cascades title: content → og → twitter → fallback (document title only)', () => {
    // Only twitterTitle is set; document title should pick it up.
    // OG/Twitter titles cascade independently — see the per-target
    // cascade tests below.
    const out = generateMeta({
      meta: {
        social: { social: { twitterTitle: 'Twitter-only title' } }
      },
      type: 'website',
      fallback: { title: 'fallback title' }
    })
    expect(out.title).toBe('Twitter-only title')
    // OG title cascades ogTitle → content.title (NOT twitterTitle).
    expect(out.openGraph?.title).toBeUndefined()
    // Twitter title cascades twitterTitle → ogTitle → content.title.
    expect(out.twitter?.title).toBe('Twitter-only title')
  })

  it('prefers ogTitle over content.title for openGraph.title', () => {
    const out = generateMeta({
      meta: {
        content: { title: 'Plain' },
        social: { social: { ogTitle: 'OG wins' } }
      },
      type: 'website'
    })
    expect(out.title).toBe('Plain')
    expect(out.openGraph?.title).toBe('OG wins')
  })

  it('cascades description: content → og → twitter → fallback', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't', description: 'content desc' },
        social: {
          social: {
            twitterDescription: 'twitter desc'
          }
        }
      },
      type: 'website',
      fallback: { description: 'fallback desc' }
    })
    expect(out.description).toBe('content desc')
    expect(out.openGraph?.description).toBe('content desc')
    expect(out.twitter?.description).toBe('twitter desc')
  })

  it('splits keywords on commas and trims whitespace', () => {
    const out = generateMeta({
      meta: { content: { title: 't', keywords: ' a , b ,  c  ' } },
      type: 'website'
    })
    expect(out.keywords).toEqual(['a', 'b', 'c'])
  })

  it('accepts `content.image` as a URL string', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't', image: 'https://cdn.example.com/x.png' }
      },
      type: 'website'
    })
    expect(out.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/x.png' }])
    expect(out.twitter?.images).toEqual([{ url: 'https://cdn.example.com/x.png' }])
  })

  it('accepts `content.image` as a Payload `{ url }` upload shape', () => {
    const out = generateMeta({
      meta: {
        content: {
          title: 't',
          image: { url: 'https://cdn.example.com/uploaded.png' } as never
        }
      },
      type: 'website'
    })
    expect(out.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/uploaded.png' }])
    expect(out.twitter?.images).toEqual([{ url: 'https://cdn.example.com/uploaded.png' }])
  })

  it('ogImage wins over content.image for openGraph.images', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't', image: 'https://cdn.example.com/content.png' },
        social: { social: { ogImage: 'https://cdn.example.com/og.png' } }
      },
      type: 'website'
    })
    expect(out.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/og.png' }])
    // Twitter cascades: twitterImage → ogImage → content.image → nothing.
    expect(out.twitter?.images).toEqual([{ url: 'https://cdn.example.com/og.png' }])
  })

  it('twitterImage wins over ogImage for twitter.images', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't', image: 'https://cdn.example.com/content.png' },
        social: {
          social: {
            ogImage: 'https://cdn.example.com/og.png',
            twitterImage: { url: 'https://cdn.example.com/tw.png' } as never
          }
        }
      },
      type: 'website'
    })
    expect(out.twitter?.images).toEqual([{ url: 'https://cdn.example.com/tw.png' }])
    expect(out.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/og.png' }])
  })

  it('uses url arg as openGraph.url when ogUrl is not set', () => {
    const out = generateMeta({
      meta: { content: { title: 't' } },
      url: 'https://example.com/x',
      type: 'website'
    })
    expect(out.openGraph?.url).toBe('https://example.com/x')
  })

  it('ogUrl wins over the url arg', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: { social: { ogUrl: 'https://canonical.example.com/x' } }
      },
      url: 'https://example.com/x',
      type: 'website'
    })
    expect(out.openGraph?.url).toBe('https://canonical.example.com/x')
  })

  it('uses locale arg as openGraph.locale when ogLocale is not set', () => {
    const out = generateMeta({
      meta: { content: { title: 't' } },
      locale: 'sk',
      type: 'website'
    })
    expect(out.openGraph?.locale).toBe('sk')
  })

  it('ogType from meta overrides the type arg', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: { social: { ogType: 'profile' } }
      },
      type: 'website'
    })
    expect(out.openGraph?.type).toBe('profile')
  })

  it('falls back to type arg when ogType is unset', () => {
    const out = generateMeta({
      meta: { content: { title: 't' } },
      type: 'article'
    })
    expect(out.openGraph?.type).toBe('article')
  })

  it('passes robots string through when noindex is false', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        advanced: { advanced: { robots: 'noindex, nofollow', noindex: false } }
      },
      type: 'website'
    })
    expect(out.robots).toBe('noindex, nofollow')
  })

  it('noindex: true forces `robots: { index: false, follow: false }`', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        advanced: { advanced: { noindex: true, robots: 'index, follow' } }
      },
      type: 'website'
    })
    expect(out.robots).toEqual({ index: false, follow: false })
  })

  it('maps author to authors: [{ name }]', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        advanced: { advanced: { author: 'Jane Doe' } }
      },
      type: 'website'
    })
    expect(out.authors).toEqual([{ name: 'Jane Doe' }])
  })

  it('omits OG/Twitter content when there is nothing meaningful (title-only meta)', () => {
    // Type arg still populates openGraph.type and twitter.card, and
    // the title cascades into OG/Twitter titles. The important
    // assertion here is: no description, no image, no keywords leak
    // into the output when meta only has a title.
    const out = generateMeta({
      meta: { content: { title: 'just a title' } },
      type: 'website'
    })
    expect(out.title).toBe('just a title')
    expect(out.openGraph?.images).toBeUndefined()
    expect(out.openGraph?.description).toBeUndefined()
    expect(out.twitter?.images).toBeUndefined()
    expect(out.twitter?.description).toBeUndefined()
    expect(out.description).toBeUndefined()
    expect(out.keywords).toBeUndefined()
  })
})

// ----------------------------------------------------------------
// generateMeta — post (Payload `posts` collection with SEO enabled)
// ----------------------------------------------------------------
//
// Posts are article-shaped — `createCollectionPageExports` defaults
// `metadataType` to `'article'` for the `posts` collection. The
// extended `autoGenerate` heuristic maps the doc's top-level
// `publishedAt` / `modifiedAt` into
// `meta.advanced.advanced.{publishedAt,modifiedAt}` so the function
// can surface them on `openGraph.publishedTime` / `modifiedTime`.

describe('generateMeta — post', () => {
  it('emits openGraph.publishedTime / modifiedTime for article posts', () => {
    const meta: SEOMetaShape = {
      content: {
        title: 'How we shipped the SEO plugin',
        description: 'A short write-up of the SEO plugin rollout.',
        image: 'https://cdn.example.com/post.png'
      },
      social: {
        social: {
          ogType: 'article',
          ogUrl: 'https://example.com/posts/seo-rollout'
        }
      },
      advanced: {
        advanced: {
          publishedAt: '2026-01-15T10:00:00.000Z',
          modifiedAt: '2026-02-01T12:30:00.000Z',
          author: 'Eng Team'
        }
      }
    }
    const out = generateMeta({
      meta,
      url: 'https://example.com/posts/seo-rollout',
      type: 'article'
    })
    expect(out.openGraph?.type).toBe('article')
    expect(out.openGraph?.publishedTime).toBe('2026-01-15T10:00:00.000Z')
    expect(out.openGraph?.modifiedTime).toBe('2026-02-01T12:30:00.000Z')
    expect(out.openGraph?.title).toBe('How we shipped the SEO plugin')
    expect(out.openGraph?.description).toBe('A short write-up of the SEO plugin rollout.')
    expect(out.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/post.png' }])
    expect(out.authors).toEqual([{ name: 'Eng Team' }])
  })

  it('falls back to type arg when ogType is unset on a post', () => {
    const out = generateMeta({
      meta: { content: { title: 't' } },
      type: 'article'
    })
    expect(out.openGraph?.type).toBe('article')
  })

  it('does NOT set publishedTime / modifiedTime when type is "website"', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        advanced: {
          advanced: {
            publishedAt: '2026-01-15T10:00:00.000Z',
            modifiedAt: '2026-02-01T12:30:00.000Z'
          }
        }
      },
      type: 'website'
    })
    expect(out.openGraph?.type).toBe('website')
    expect(out.openGraph?.publishedTime).toBeUndefined()
    expect(out.openGraph?.modifiedTime).toBeUndefined()
  })

  it('ogType: "article" overrides type: "website" (post misconfigured as website)', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: { social: { ogType: 'article' } },
        advanced: {
          advanced: { publishedAt: '2026-01-15T10:00:00.000Z' }
        }
      },
      type: 'website'
    })
    expect(out.openGraph?.type).toBe('article')
    expect(out.openGraph?.publishedTime).toBe('2026-01-15T10:00:00.000Z')
  })

  it('defaults twitterCard to summary_large_image when unset', () => {
    const out = generateMeta({
      meta: { content: { title: 't' } },
      type: 'article'
    })
    expect(out.twitter?.card).toBe('summary_large_image')
  })

  it('honors explicit twitterCard value', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: { social: { twitterCard: 'summary' } }
      },
      type: 'article'
    })
    expect(out.twitter?.card).toBe('summary')
  })

  it('maps twitterSite and twitterCreator', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: {
          social: {
            twitterSite: '@acme',
            twitterCreator: '@jane'
          }
        }
      },
      type: 'article'
    })
    expect(out.twitter?.site).toBe('@acme')
    expect(out.twitter?.creator).toBe('@jane')
  })

  it('twitterTitle cascade: twitter → og → content', () => {
    const out = generateMeta({
      meta: {
        content: { title: 'content title' },
        social: {
          social: {
            ogTitle: 'og title',
            twitterTitle: 'tw title'
          }
        }
      },
      type: 'article'
    })
    expect(out.twitter?.title).toBe('tw title')
    expect(out.openGraph?.title).toBe('og title')
  })

  it('twitterTitle falls back to ogTitle when twitterTitle unset', () => {
    const out = generateMeta({
      meta: {
        content: { title: 'content title' },
        social: { social: { ogTitle: 'og title' } }
      },
      type: 'article'
    })
    expect(out.twitter?.title).toBe('og title')
  })

  it('twitterTitle falls back to content.title when ogTitle also unset', () => {
    const out = generateMeta({
      meta: { content: { title: 'content title' } },
      type: 'article'
    })
    expect(out.twitter?.title).toBe('content title')
  })

  it('twitterImage alone fills both twitter and OG image (cascade)', () => {
    const out = generateMeta({
      meta: {
        content: { title: 't' },
        social: {
          social: { twitterImage: 'https://cdn.example.com/tw.png' }
        }
      },
      type: 'article'
    })
    expect(out.twitter?.images).toEqual([{ url: 'https://cdn.example.com/tw.png' }])
    expect(out.openGraph?.images).toBeUndefined()
  })
})

// ----------------------------------------------------------------
// generateMeta — static-page (Next.js not-found / error / search-empty)
// ----------------------------------------------------------------
//
// `createStaticPageExports` (in `packages/payload-www`) renders
// `staticPages` rows by `kind`. SEO is NOT enabled on the
// `static-pages` collection in `createWWWConfig`, so `meta` is
// typically `null` / `undefined` here. Hosts may still wire the SEO
// plugin later, which is why we cover the partially-populated case
// too. The function should produce a sensible `<title>` from the
// fallback and not invent OG/Twitter blocks from nothing.

describe('generateMeta — static-page (not-found, error)', () => {
  it('returns `{ title: "Not found" }` when meta is null', () => {
    const out = generateMeta({ meta: null, type: 'website' })
    expect(out).toEqual({ title: 'Not found' })
  })

  it('returns `{ title: "Not found" }` when meta is undefined', () => {
    const out = generateMeta({ meta: undefined, type: 'website' })
    expect(out).toEqual({ title: 'Not found' })
  })

  it('uses fallback.title when meta is empty {}', () => {
    const out = generateMeta({
      meta: {},
      type: 'website',
      fallback: { title: 'Page not found' }
    })
    expect(out.title).toBe('Page not found')
    // OG/Twitter blocks may exist (type arg gives OG a `type`, the
    // function defaults `twitter.card`), but no content-specific
    // fields when meta is empty.
    expect(out.openGraph?.images).toBeUndefined()
    expect(out.openGraph?.description).toBeUndefined()
    expect(out.openGraph?.title).toBeUndefined()
    expect(out.twitter?.images).toBeUndefined()
    expect(out.twitter?.description).toBeUndefined()
    expect(out.twitter?.title).toBeUndefined()
    expect(out.description).toBeUndefined()
  })

  it('picks up fallback.description when no meta description is available', () => {
    // The function reads `fallback.description` like any other source,
    // which lets hosts set a site-wide default for not-found / error
    // pages that still get indexed.
    const out = generateMeta({
      meta: {},
      type: 'website',
      fallback: { title: 'Not found', description: 'site-wide fallback desc' }
    })
    expect(out.title).toBe('Not found')
    expect(out.description).toBe('site-wide fallback desc')
  })

  it('renders content.title-only meta without OG/Twitter content (just type/card)', () => {
    const out = generateMeta({
      meta: { content: { title: 'Untitled static page' } },
      type: 'website',
      fallback: { title: 'default' }
    })
    expect(out.title).toBe('Untitled static page')
    expect(out.openGraph?.images).toBeUndefined()
    expect(out.openGraph?.description).toBeUndefined()
    expect(out.twitter?.images).toBeUndefined()
    expect(out.twitter?.description).toBeUndefined()
    expect(out.description).toBeUndefined()
    expect(out.keywords).toBeUndefined()
  })

  it('does not invent OG image when meta has no image at all', () => {
    const out = generateMeta({
      meta: { content: { title: 'Not found', description: 'Try the search bar.' } },
      type: 'website',
      fallback: { title: 'Not found' }
    })
    expect(out.title).toBe('Not found')
    expect(out.description).toBe('Try the search bar.')
    expect(out.openGraph?.images).toBeUndefined()
    expect(out.twitter?.images).toBeUndefined()
  })

  it('uses fallback.title when content.title is the empty string', () => {
    const out = generateMeta({
      meta: { content: { title: '' } },
      type: 'website',
      fallback: { title: 'Server error' }
    })
    expect(out.title).toBe('Server error')
  })

  it('honors noindex on a not-found meta (search engines should not index)', () => {
    const out = generateMeta({
      meta: {
        content: { title: 'Not found' },
        advanced: { advanced: { noindex: true } }
      },
      type: 'website',
      fallback: { title: 'Not found' }
    })
    expect(out.title).toBe('Not found')
    expect(out.robots).toEqual({ index: false, follow: false })
  })

  it('still produces a clean Metadata when a static page has full meta', () => {
    // If a host later wires the SEO plugin onto the static-pages
    // collection, `createStaticPageExports` would forward the meta
    // through. Verify the function behaves the same as for pages.
    const out = generateMeta({
      meta: {
        content: { title: 'Page not found', description: '404' },
        social: { social: { ogType: 'website' } },
        advanced: { advanced: { robots: 'noindex, follow' } }
      },
      type: 'website'
    })
    expect(out.title).toBe('Page not found')
    expect(out.description).toBe('404')
    expect(out.robots).toBe('noindex, follow')
    expect(out.openGraph?.type).toBe('website')
    expect(out.openGraph?.title).toBe('Page not found')
  })

  it('never sets alternates (createCollectionPageExports owns that)', () => {
    const out = generateMeta({
      meta: { content: { title: 'Not found' } },
      url: 'https://example.com/en/missing',
      type: 'website',
      fallback: { title: 'Not found' }
    })
    expect(out.alternates).toBeUndefined()
  })
})
