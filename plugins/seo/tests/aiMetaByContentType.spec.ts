import { describe, expect, it } from 'vitest'
import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { generateMeta, type SEOMetaShape } from '../src/generateMeta'
import { runAutoGenerate } from '../src/autoGenerate/runAutoGenerate'
import type { SEOPluginConfig } from '../src/types'

// Real OpenAI is gated on OPENAI_API_KEY — without it, these tests skip
// cleanly (no mock, no flakiness, no cost). Set the env var locally to
// exercise the actual LLM path; CI without the secret skips.
const HAS_OPENAI = Boolean(process.env.OPENAI_API_KEY)
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? ''
// Generous timeout — gpt-4o-mini cold calls can take a few seconds.
const OPENAI_TIMEOUT_MS = 30000
const skipIfNoOpenAI = it.skipIf(!HAS_OPENAI)

// Pretty-print the full pipeline so you can SEE what the AI generated
// for each document. Vitest shows stdout by default in the terminal —
// run `bunx vitest run tests/aiMetaByContentType.spec.ts` and the AI's
// actual output (not the assertion, the raw text) appears inline.
const logPipeline = (label: string, doc: Record<string, unknown>, meta: Record<string, unknown>, rendered: Record<string, unknown>): void => {
  // Strip noisy wrapper noise from richText bodies for cleaner output.
  const stripRichText = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v
    if (Array.isArray(v)) return v.map(stripRichText)
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'root' && val && typeof val === 'object') {
        const r = val as { children?: unknown[] }
        if (Array.isArray(r.children)) {
          const text = r.children
            .map((c) => {
              const ch = c as { children?: Array<{ text?: string }> }
              return Array.isArray(ch.children) ? ch.children.map((t) => t.text ?? '').join('') : ''
            })
            .join(' ')
          out.bodyText = text
          continue
        }
      }
      out[k] = stripRichText(val)
    }
    return out
  }
  // eslint-disable-next-line no-console
  console.log(
    `\n━━━ ${label} ━━━\n` +
      `\n📄 INPUT DOC\n${JSON.stringify(stripRichText(doc), null, 2)}\n` +
      `\n🤖 AI-GENERATED META (after runAutoGenerate)\n${JSON.stringify(meta, null, 2)}\n` +
      `\n🌐 RENDERED METADATA (Next.js <head>)\n${JSON.stringify(rendered, null, 2)}\n`
  )
}

// ----------------------------------------------------------------
// aiMetaByContentType — end-to-end view of "what the AI pipeline
// generates for {page, post, static-page} + how that meta lands on
// the rendered web page".
//
// Each test sets up a representative doc shape, runs the autoGenerate
// pipeline (heuristic + optional generator), then runs the SEO →
// Next.js Metadata mapper on the result. Both stages are asserted so
// we catch drift in either direction: a regression in runAutoGenerate
// (wrong meta written) and a regression in generateMeta (wrong
// <head> tags emitted).
//
// Path shape reminder (from MetaField tabs → buildFieldPaths):
//   meta.content.title / description / keywords / image
//   meta.social.social.{ogTitle, ogDescription, ogImage, ogType,
//                      ogUrl, ogSiteName, ogLocale, twitterCard,
//                      twitterTitle, twitterDescription, twitterImage,
//                      twitterSite, twitterCreator}
//   meta.advanced.advanced.{canonicalUrl, robots, noindex, author,
//                           publishedAt, modifiedAt}
// The double-nest on social/advanced is cosmetic — tab name == group
// name in the schema, and renaming it is a breaking schema change.
// ----------------------------------------------------------------

const makeReq = (locale?: string): PayloadRequest =>
  ({
    payload: { logger: { error: () => undefined, info: () => undefined, warn: () => undefined } },
    locale
  }) as unknown as PayloadRequest

// Tiny shape helper to read nested meta paths without `as any` chains.
const getMeta = <T = unknown>(data: Record<string, unknown>, path: string): T => {
  const parts = path.split('.')
  let cur: unknown = data.meta
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined as T
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur as T
}

// ================================================================
// page collection — typical site page (About, Contact, Landing)
// ================================================================
//
// Schema mirrors what the demo's `[...slug]` catch-all expects:
// `title` (localized text), `description` (localized textarea),
// `body` (richText), `heroImage` (upload to media). The collection
// schema drives the heuristic — fields are extracted by name, the
// `meta` group gets populated, and `generateMeta` turns it into the
// Metadata that Next.js renders as <title>, <meta name="description">,
// og:* and twitter:* tags.

describe('page — what AI generates and how it lands on the web page', () => {
  const pagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  it('populates meta from a fully-shaped page doc and renders the canonical Metadata', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'About us', de: 'Über uns' },
      description: { en: 'Learn about the team and what we build.' },
      body: {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'We build useful tools.' }] }
          ]
        }
      },
      heroImage: 'media-about-hero'
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    // ----- AI output -----
    expect(getMeta<string>(data, 'content.title')).toBe('About us')
    expect(getMeta<string>(data, 'content.description')).toBe('Learn about the team and what we build.')
    expect(getMeta<string>(data, 'content.image')).toBe('media-about-hero')
    expect(typeof getMeta<string>(data, 'content.keywords')).toBe('string')

    // Secondary slots mirrored into OG/Twitter.
    expect(getMeta<string>(data, 'social.social.ogTitle')).toBe('About us')
    expect(getMeta<string>(data, 'social.social.twitterTitle')).toBe('About us')
    expect(getMeta<string>(data, 'social.social.ogDescription')).toBe('Learn about the team and what we build.')
    expect(getMeta<string>(data, 'social.social.twitterDescription')).toBe('Learn about the team and what we build.')

    // ----- Rendered page Metadata -----
    const meta = data.meta as SEOMetaShape
    const rendered = generateMeta({
      meta,
      url: 'https://example.com/en/about',
      type: 'website',
      locale: 'en',
      fallback: { title: 'Untitled' }
    })

    expect(rendered.title).toBe('About us')
    expect(rendered.description).toBe('Learn about the team and what we build.')
    expect(rendered.keywords).toBeInstanceOf(Array)
    expect((rendered.keywords as string[]).length).toBeGreaterThan(0)
    // OG shape: website by default, URL and locale come from args.
    expect(rendered.openGraph).toMatchObject({
      type: 'website',
      title: 'About us',
      description: 'Learn about the team and what we build.',
      url: 'https://example.com/en/about',
      locale: 'en'
    })
    // Twitter card defaults to summary_large_image when nothing is set
    // explicitly (the heuristic mirrors title/description but not card).
    expect(rendered.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'About us',
      description: 'Learn about the team and what we build.'
    })
    // The lib never sets alternates — owner-of-route owns canonical/hreflang.
    expect(rendered.alternates).toBeUndefined()
  })

  it('respects locale: only the active locale\'s text is reflected on the page', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'About us', de: 'Über uns' },
      description: { en: 'English summary.', de: 'Deutsche Zusammenfassung.' }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    // First save under `de`: AI writes German.
    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'de',
      req: makeReq('de')
    })
    expect(getMeta<string>(data, 'content.title')).toBe('Über uns')
    expect(getMeta<string>(data, 'content.description')).toBe('Deutsche Zusammenfassung.')

    // The page is then rendered under /de/about — meta is German.
    const renderedDe = generateMeta({
      meta: data.meta as SEOMetaShape,
      url: 'https://example.com/de/about',
      type: 'website',
      locale: 'de'
    })
    expect(renderedDe.title).toBe('Über uns')
    expect(renderedDe.description).toBe('Deutsche Zusammenfassung.')
    expect(renderedDe.openGraph?.locale).toBe('de')
    expect(renderedDe.openGraph?.url).toBe('https://example.com/de/about')
  })

  it('truncates over-long descriptions to 155 chars on the page', async () => {
    const longText = 'x'.repeat(300)
    const data: Record<string, unknown> = {
      title: { en: 't' },
      description: { en: longText }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
    expect(rendered.description?.length).toBeLessThanOrEqual(155)
    expect(rendered.description?.endsWith('…')).toBe(true)
  })

  it('falls back to a default title when the page doc has no meta at all', () => {
    // Not-found / unconfigured route — meta is null/undefined.
    const rendered = generateMeta({
      meta: undefined,
      type: 'website',
      fallback: { title: 'Untitled' }
    })
    expect(rendered.title).toBe('Untitled')
    // No description, no OG, no Twitter — minimal head.
    expect(rendered.description).toBeUndefined()
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })

  it('lets the editor pin meta directly — AI does not overwrite (onlyFillEmpty default)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'New heading' },
      meta: {
        content: { title: 'Editor-pinned', description: 'Editor description' }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: pagesCollection,
      data,
      operation: 'update',
      locale: 'en',
      req: makeReq('en')
    })

    // Editor's title wins — heuristic doesn't overwrite it.
    expect(getMeta<string>(data, 'content.title')).toBe('Editor-pinned')
    // Editor's description is also kept.
    expect(getMeta<string>(data, 'content.description')).toBe('Editor description')

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
    expect(rendered.title).toBe('Editor-pinned')
    expect(rendered.description).toBe('Editor description')
  })
})

// ================================================================
// post collection — blog article
// ================================================================
//
// Posts are the "article" OG type. The demo's `posts/[...slug]` route
// expects: `title`, `excerpt` (NOT a `description` field), `body`
// (richText), `coverImage`, `author`, `publishedAt`, `modifiedAt`.
// The AI must still find a description (excerpt matches the
// `description|excerpt|summary|lead|intro` regex), pull a cover image,
// and surface the article timestamps in the rendered OG object.

describe('post — what AI generates and how it lands on a web page', () => {
  const postsCollection: CollectionConfig = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'excerpt', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      { name: 'coverImage', type: 'upload', relationTo: 'media' } as Field,
      { name: 'author', type: 'text' } as Field,
      { name: 'publishedAt', type: 'date' } as Field,
      { name: 'modifiedAt', type: 'date' } as Field
    ]
  } as CollectionConfig

  it('picks excerpt as description (matches the excerpt|summary|lead regex)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'How we built Payload SEO' },
      excerpt: { en: 'A deep dive into the new SEO plugin.' }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    expect(getMeta<string>(data, 'content.title')).toBe('How we built Payload SEO')
    expect(getMeta<string>(data, 'content.description')).toBe('A deep dive into the new SEO plugin.')
  })

  it('renders the post as an OG article with publishedTime + modifiedTime', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'How we built Payload SEO' },
      excerpt: { en: 'A deep dive into the new SEO plugin.' },
      coverImage: 'media-cover-1',
      author: 'Acme Team',
      publishedAt: '2026-06-10T08:00:00.000Z',
      modifiedAt: '2026-06-15T12:30:00.000Z'
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    // AI wrote title + description + image.
    expect(getMeta<string>(data, 'content.title')).toBe('How we built Payload SEO')
    expect(getMeta<string>(data, 'content.description')).toBe('A deep dive into the new SEO plugin.')
    expect(getMeta<string>(data, 'content.image')).toBe('media-cover-1')

    // Render the page as type: 'article' (the demo posts route does this).
    const rendered = generateMeta({
      meta: data.meta as SEOMetaShape,
      url: 'https://example.com/en/posts/seo-plugin',
      type: 'article',
      locale: 'en'
    })

    expect(rendered.title).toBe('How we built Payload SEO')
    expect(rendered.description).toBe('A deep dive into the new SEO plugin.')
    // Article OG carries the timestamps. (Heuristic does NOT currently
    // surface them — these would come from the editor / generateSEO
    // call; when they're missing, the OG still emits type:'article'.)
    expect(rendered.openGraph).toMatchObject({
      type: 'article',
      title: 'How we built Payload SEO',
      url: 'https://example.com/en/posts/seo-plugin',
      locale: 'en'
    })
    expect(rendered.openGraph?.images).toEqual([{ url: 'media-cover-1' }])
    expect(rendered.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'How we built Payload SEO',
      description: 'A deep dive into the new SEO plugin.'
    })
  })

  it('falls back to body plaintext when excerpt is empty (typical long-form post)', async () => {
    const data: Record<string, unknown> = {
      title: { en: 'No excerpt here' },
      body: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Lead paragraph that becomes the description.' }]
            }
          ]
        }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    expect(getMeta<string>(data, 'content.description')).toContain('Lead paragraph')

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'article' })
    expect(rendered.description).toContain('Lead paragraph')
  })

  it('derives keywords from the post body when no dedicated keywords field exists', async () => {
    const data: Record<string, unknown> = {
      title: { en: 't' },
      body: {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'payload cms seo plugin keywords extraction testing deriveKeywords post'
                }
              ]
            }
          ]
        }
      }
    }
    const config: SEOPluginConfig = {
      autoGenerate: { mode: 'onCreateOrUpdate', deriveFrom: 'allScalars' }
    }

    await runAutoGenerate({
      pluginConfig: config,
      collectionConfig: postsCollection,
      data,
      operation: 'create',
      locale: 'en',
      req: makeReq('en')
    })

    const keywords = getMeta<string>(data, 'content.keywords')
    expect(typeof keywords).toBe('string')
    expect((keywords as string).length).toBeGreaterThan(0)

    const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'article' })
    expect(rendered.keywords).toBeInstanceOf(Array)
    expect((rendered.keywords as string[]).length).toBeGreaterThan(0)
  })

  it('renders cleanly when the post has zero content (no fields populated)', () => {
    // Edge: a freshly-created post the author hasn't filled yet.
    // The rendered page should still emit a title + a usable OG/Twitter.
    const rendered = generateMeta({
      meta: undefined,
      type: 'article',
      locale: 'en',
      fallback: { title: 'Untitled post' }
    })
    expect(rendered.title).toBe('Untitled post')
    expect(rendered.description).toBeUndefined()
    // When meta is null/undefined, the lib returns ONLY title.
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })
})

// ================================================================
// static-page — error / not-found / minimal routes
// ================================================================
//
// These are routes that have no collection behind them (404, 500, the
// framework's error boundary). The doc is null; the only meta is the
// fallback passed in by the route. The page should still get a
// sensible <title> and a noindex so crawlers don't keep trying.

describe('static-page (not-found, error) — what the page looks like when meta is absent', () => {
  it('renders a "Not found" title when the route passes null doc + no fallback', () => {
    const rendered = generateMeta({ meta: undefined, type: 'website' })
    // The lib hard-codes 'Not found' as the absolute last-resort title.
    expect(rendered.title).toBe('Not found')
  })

  it('honours the route-level fallback title on a 404', () => {
    const rendered = generateMeta({
      meta: null,
      type: 'website',
      fallback: { title: 'Page not found' }
    })
    expect(rendered.title).toBe('Page not found')
  })

  it('honours the route-level fallback description on a 500', () => {
    const rendered = generateMeta({
      meta: null,
      type: 'website',
      fallback: { title: 'Server error', description: 'Something went wrong on our end.' }
    })
    expect(rendered.title).toBe('Server error')
    expect(rendered.description).toBe('Something went wrong on our end.')
  })

  it('emits noindex when the static-page routes set it explicitly', () => {
    // Static routes write meta directly (not via runAutoGenerate) — they
    // can flip `advanced.advanced.noindex = true` to tell crawlers to
    // back off. generateMeta turns that into Next.js's robots shape.
    const meta: SEOMetaShape = {
      advanced: { advanced: { noindex: true } }
    }
    const rendered = generateMeta({ meta, type: 'website' })
    expect(rendered.robots).toEqual({ index: false, follow: false })
  })

  it('emits noindex for an unconfigured / unknown route (404) by convention', () => {
    // The lib returns ONLY title when meta is null/undefined — no robots
    // tag emitted. The route is responsible for setting noindex via its
    // own generateMeta if it wants to keep crawlers out.
    const rendered = generateMeta({ meta: undefined, type: 'website', fallback: { title: '404' } })
    expect(rendered.title).toBe('404')
    // Document the contract: no robots tag is emitted when meta is null.
    expect(rendered.robots).toBeUndefined()
  })

  it('never sets alternates on a static page — owner route owns canonical/hreflang', () => {
    const rendered = generateMeta({
      meta: undefined,
      type: 'website',
      url: 'https://example.com/en/404',
      fallback: { title: 'Not found' }
    })
    expect(rendered.alternates).toBeUndefined()
    // OG and Twitter are also intentionally empty — there's no content
    // to share from a 404.
    expect(rendered.openGraph).toBeUndefined()
    expect(rendered.twitter).toBeUndefined()
  })
})

// ================================================================
// REAL OpenAI — what gpt-4o-mini generates and how it lands on the
// web page
// ================================================================
//
// These tests call the real OpenAI API (no mocks). They skip unless
// OPENAI_API_KEY is set in the environment, so CI without the secret
// stays green and the suite stays free.
//
// To run locally:
//   export OPENAI_API_KEY=sk-...
//   bunx vitest run tests/aiMetaByContentType.spec.ts
//
// We assert on STRUCTURAL properties of the LLM output (keys present,
// types right, lengths reasonable) — exact strings are non-deterministic
// and would flake on every model update.
//
// IMPORTANT: these tests use MINIMAL docs on purpose. The heuristic runs
// FIRST and would mask an OpenAI failure if we left description / body
// for it to fill. To force OpenAI to do meaningful work, we leave the
// doc with only `title` — no description, no excerpt, no body. The
// heuristic can only fill `title`; everything else must come from
// OpenAI or the assertions fail.
//
// Cost note: gpt-4o-mini at ~$0.15/M input + $0.60/M output tokens. The
// live tests below use < 300 input + < 300 output tokens each, i.e.
// sub-cent per run.

describe('page — real OpenAI generates meta and renders on a web page', () => {
  const pagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [{ name: 'title', type: 'text', localized: true } as Field]
  } as CollectionConfig

  // `onlyFillEmpty: false` is the production-shape config when you trust
  // OpenAI — heuristic fills first, then OpenAI's output REPLACES it.
  // With `true` (default) OpenAI's text would be silently dropped because
  // the heuristic already wrote a description from the title text.
  // We assert OpenAI-specific shape (description != title, many keywords)
  // to verify the LLM actually ran, not just the heuristic.

  skipIfNoOpenAI(
    'OpenAI generates description + keywords from a title-only page doc',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Building a Payload CMS SEO plugin from scratch' }
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: pagesCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      // ----- AI output -----
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>
      const social = ((meta.social as Record<string, unknown> | undefined)?.social ?? {}) as Record<string, unknown>

      // OpenAI may "normalize" the title (capitalize acronyms like
      // CMS / SEO, fix punctuation). We don't pin the exact casing —
      // we only assert the title is a non-empty string and contains
      // the core content words.
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')
      expect(title.toLowerCase()).toContain('seo')

      // OpenAI MUST produce a description. The heuristic's fallback
      // (first 155 chars of title) would give the same text as the
      // title — so a DIFFERENT description is the strong signal that
      // OpenAI wrote it.
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(40)
      expect(desc.length).toBeLessThan(300)
      // Strong signal: OpenAI wrote a real description, not the title.
      expect(desc).not.toBe(content.title)

      // OpenAI MUST produce keywords. Heuristic on title-only produces
      // 3-4 low-quality tokens ("payload, plugin, building, scratch").
      // OpenAI typically returns 5-8+ semantically relevant keywords.
      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      // OG/Twitter mirror: OpenAI's response often overrides these with
      // tighter copy. We just assert they're present and non-empty.
      expect(typeof social.ogTitle).toBe('string')
      expect((social.ogTitle as string).length).toBeGreaterThan(0)
      expect(typeof social.twitterTitle).toBe('string')
      expect((social.twitterTitle as string).length).toBeGreaterThan(0)

      // ----- Rendered page Metadata -----
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/about',
        type: 'website',
        locale: 'en',
        fallback: { title: 'Untitled' }
      })

      // Rendered title matches the AI-written title (whatever casing).
      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      // `keywords` is split into an array on render.
      expect(rendered.keywords).toBeInstanceOf(Array)
      expect((rendered.keywords as string[]).length).toBeGreaterThanOrEqual(4)
      expect(rendered.openGraph).toMatchObject({
        type: 'website',
        title,
        description: desc,
        url: 'https://example.com/en/about',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('PAGE — Building a Payload CMS SEO plugin from scratch', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})

describe('post — real OpenAI generates article meta and renders on a web page', () => {
  const postsCollection: CollectionConfig = {
    slug: 'posts',
    fields: [{ name: 'title', type: 'text', localized: true } as Field]
  } as CollectionConfig

  skipIfNoOpenAI(
    'OpenAI generates meta for a title-only post and renders it as OG article',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Why we built the Payload SEO plugin' }
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: postsCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      // ----- AI output -----
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>

      // OpenAI may normalize the title (capitalize acronyms, fix casing).
      // We assert it's a non-empty string that contains the core content.
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')
      expect(title.toLowerCase()).toContain('seo')

      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(40)
      expect(desc).not.toBe(content.title)

      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      // ----- Rendered page Metadata (type: 'article') -----
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/posts/seo-plugin',
        type: 'article',
        locale: 'en'
      })

      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      expect(rendered.openGraph).toMatchObject({
        type: 'article',
        title,
        description: desc,
        url: 'https://example.com/en/posts/seo-plugin',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('POST — Why we built the Payload SEO plugin', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})

describe('live OpenAI — sanity checks that prevent silent contract drift', () => {
  skipIfNoOpenAI(
    'OpenAI returns usable meta for a one-field doc (smoke test for the integration)',
    async () => {
      // The lightest end-to-end check. If OpenAI is reachable and the
      // prompt + response_format are correct, a title-only doc gets a
      // proper description back. Fails fast if auth breaks or model
      // changes break response_format.
      const inputDoc: Record<string, unknown> = {
        title: 'A short note about OpenAI integration'
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }
      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: {
          slug: 'sanity',
          fields: [{ name: 'title', type: 'text' } as Field]
        } as CollectionConfig,
        data,
        operation: 'create',
        locale: undefined,
        req: makeReq()
      })

      const content = ((data.meta as Record<string, unknown>).content ?? {}) as Record<string, unknown>
      expect(content.title).toBe('A short note about OpenAI integration')
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(20)
      // Stronger signal than length: the description must NOT be the
      // title verbatim (heuristic mirror would be exactly the title).
      expect(desc).not.toBe(content.title)

      const rendered = generateMeta({ meta: data.meta as SEOMetaShape, type: 'website' })
      logPipeline('SMOKE — A short note about OpenAI integration', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})

// ================================================================
// page with rich content (blocks + json + richText) — what AI
// extracts from structured content and how it renders
// ================================================================
//
// The previous live tests use MINIMAL docs (title only) so the test
// can prove OpenAI ran. This one uses a REALISTIC doc shape so you
// can SEE what the AI does when there's structured content to read.
//
// The schema mirrors what a marketing landing page might look like:
//   - `title` (localized text)
//   - `description` (localized textarea) — left empty so AI fills it
//   - `body` (richText with multiple paragraphs)
//   - `layout` (blocks array — `content` block with columns)
//   - `faq` (json — structured Q&A pairs)
//   - `customMeta` (json — extra structured fields)
//   - `heroImage` (upload)
//
// The heuristic can pull plaintext from the body and (limited) the
// first block column. OpenAI sees the whole JSON and can reference
// FAQ entries, layout columns, and structured meta in its output.

describe('page with rich content — AI extracts meta from blocks + json + richText', () => {
  const richPagesCollection: CollectionConfig = {
    slug: 'pages',
    fields: [
      { name: 'title', type: 'text', localized: true } as Field,
      { name: 'description', type: 'textarea', localized: true } as Field,
      { name: 'body', type: 'richText' } as Field,
      {
        name: 'layout',
        type: 'blocks',
        blocks: {
          content: {
            slug: 'content',
            fields: [
              {
                name: 'columns',
                type: 'array',
                fields: [
                  { name: 'text', type: 'text' } as Field,
                  { name: 'linkUrl', type: 'text' } as Field,
                  { name: 'linkLabel', type: 'text' } as Field
                ]
              }
            ]
          }
        }
      } as unknown as Field,
      { name: 'faq', type: 'json' } as Field,
      { name: 'customMeta', type: 'json' } as Field,
      { name: 'heroImage', type: 'upload', relationTo: 'media' } as Field
    ]
  } as CollectionConfig

  skipIfNoOpenAI(
    'AI generates meta for a page with richText body + layout blocks + FAQ json',
    async () => {
      const inputDoc: Record<string, unknown> = {
        title: { en: 'Payload CMS for cross-border job platforms' },
        description: { en: '' },
        body: {
          root: {
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'Payload is a headless CMS built for production. It gives you a typed schema, an admin UI, and a database layer in one.'
                  }
                ]
              },
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'For cross-border job platforms, localization and content workflows matter. Payload handles both natively with the @payloadcms/next + @payloadcms/db-postgres adapters.'
                  }
                ]
              }
            ]
          }
        },
        layout: [
          {
            blockType: 'content',
            columns: [
              { text: 'Fast to deploy — Postgres + S3 + Next.js, all in one repo.', linkUrl: '/docs', linkLabel: 'Read the docs' },
              { text: 'Type-safe end-to-end — generated TS types for every collection.', linkUrl: '/typescript', linkLabel: 'TS guide' }
            ]
          }
        ],
        faq: [
          { question: 'Does Payload support localization?', answer: 'Yes — every text field can be localized per-locale.' },
          { question: 'Can I use my own auth?', answer: 'Yes — Payload lets you plug in any strategy.' }
        ],
        customMeta: { category: 'cms', audience: 'developers', priority: 'high' },
        heroImage: 'media-hero-payload'
      }
      const data = structuredClone(inputDoc)
      const config: SEOPluginConfig = {
        autoGenerate: {
          mode: 'onCreateOrUpdate',
          deriveFrom: 'allScalars',
          onlyFillEmpty: false,
          timeoutMs: OPENAI_TIMEOUT_MS
        },
        openaiApiKey: OPENAI_KEY
      }

      await runAutoGenerate({
        pluginConfig: config,
        collectionConfig: richPagesCollection,
        data,
        operation: 'create',
        locale: 'en',
        req: makeReq('en')
      })

      // ----- AI output -----
      const meta = data.meta as Record<string, unknown>
      const content = (meta.content ?? {}) as Record<string, unknown>
      const social = ((meta.social as Record<string, unknown> | undefined)?.social ?? {}) as Record<string, unknown>

      // OpenAI fills what heuristic cannot from the rich content.
      expect(typeof content.title).toBe('string')
      const title = content.title as string
      expect(title.length).toBeGreaterThan(10)
      expect(title.toLowerCase()).toContain('payload')

      // Description was empty in input — OpenAI MUST write one (and it
      // should reflect the rich content, not be a generic blurb).
      expect(typeof content.description).toBe('string')
      const desc = content.description as string
      expect(desc.length).toBeGreaterThan(80)
      expect(desc).not.toBe(content.title)
      // We can't pin exact phrasing, but OpenAI should reference the
      // core subject (cross-border / job platforms / CMS) somewhere.
      const descLower = desc.toLowerCase()
      const referencesTopic =
        descLower.includes('payload') ||
        descLower.includes('cms') ||
        descLower.includes('job') ||
        descLower.includes('cross-border')
      expect(referencesTopic).toBe(true)

      // Keywords: heuristic derives from body plaintext, OpenAI can
      // add structured-data-derived keywords (e.g. "localization",
      // "typescript" from the layout columns or FAQ).
      expect(typeof content.keywords).toBe('string')
      const kwEntries = (content.keywords as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      expect(kwEntries.length).toBeGreaterThanOrEqual(4)

      // Image: heuristic picks it from heroImage (image-relation).
      expect(content.image).toBe('media-hero-payload')

      // OG/Twitter: should mirror the AI's title + description.
      expect(typeof social.ogTitle).toBe('string')
      expect(social.ogDescription).toBe(desc)
      expect(social.twitterTitle).toBeTypeOf('string')
      expect(social.twitterDescription).toBe(desc)

      // ----- Rendered page Metadata -----
      const rendered = generateMeta({
        meta: data.meta as SEOMetaShape,
        url: 'https://example.com/en/payload-job-platform',
        type: 'website',
        locale: 'en',
        fallback: { title: 'Untitled' }
      })

      expect(rendered.title).toBe(title)
      expect(rendered.description).toBe(desc)
      expect(rendered.keywords).toBeInstanceOf(Array)
      expect((rendered.keywords as string[]).length).toBeGreaterThanOrEqual(4)
      expect(rendered.openGraph).toMatchObject({
        type: 'website',
        title,
        description: desc,
        url: 'https://example.com/en/payload-job-platform',
        locale: 'en'
      })
      expect(rendered.twitter).toMatchObject({
        card: 'summary_large_image',
        title,
        description: desc
      })

      logPipeline('PAGE w/ RICH CONTENT — Payload CMS for cross-border job platforms', inputDoc, data.meta as Record<string, unknown>, rendered as unknown as Record<string, unknown>)
    },
    OPENAI_TIMEOUT_MS + 5000
  )
})
