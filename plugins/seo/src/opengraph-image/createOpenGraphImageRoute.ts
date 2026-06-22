import type { ComponentType } from 'react'
import { createElement } from 'react'

import type { ImportMap, SanitizedCollectionConfig, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import { extractSEOMetaForImage, type SEOMetaImageProps } from './extractSEOMetaForImage'
import { getCollectionOGImagePath } from './getCollectionOGImagePath'

/**
 * The shape Next.js hands a generated OG image route. Next 15+ types
 * `params` as a Promise; we await it before reading. Older Next types
 * are compatible too — `await` on a non-Promise is a no-op.
 */
export type OpenGraphImageRouteParams = Record<string, string | string[] | undefined>

export type OpenGraphImageRouteContext = {
  params: Promise<OpenGraphImageRouteParams>
}

/**
 * The factory's return type. We re-export `ImageResponse` from
 * `next/og` indirectly — the host's `opengraph-image.tsx` doesn't need
 * to import it directly. The route returns the image OR `undefined`
 * (when the collection has no `custom.ogImage` set) so Next.js falls
 * through to the host's `<meta property="og:image">` tag from
 * `generateMeta`.
 */
export type OpenGraphImageRoute = (
  ctx: OpenGraphImageRouteContext
) => Promise<ImageResponse | undefined> | undefined

// `ImageResponse` lives in `next/og`. We re-type it here so consumers
// don't have to import from `next/og` themselves, and so the route
// factory compiles even when `next/og` is hoisted into a different
// bundle (e.g. edge runtime). The runtime value comes from the
// dynamic import below.
type ImageResponse = {
  // Minimal structural typing — `next/og`'s actual class is heavier
  // and gets stripped by `dts` bundlers. Returning a structural
  // instance is enough for Next.js to render it.
}

const loadImageResponse = async (): Promise<new (...args: any[]) => unknown> => {
  // Dynamic import keeps `next/og` out of the cold bundle path —
  // only loaded when the OG route is actually hit at request time.
  const mod = (await import('next/og')) as unknown as {
    ImageResponse: new (...args: any[]) => unknown
  }
  return mod.ImageResponse
}

const toParamString = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v

const toParamNumber = (v: string | string[] | undefined): number | undefined => {
  const s = toParamString(v)
  if (s === undefined) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

export type CreateOpenGraphImageRouteArgs = {
  /**
   * The host's Payload config (same module imported by `payload.config.ts`).
   * Passed straight through to `getPayload({ config })`. `Promise<>` is
   * supported too — the factory awaits it once and reuses the resolved
   * config for both the `getPayload` call and the collection lookup.
   */
  config: SanitizedConfig | Promise<SanitizedConfig>

  /**
   * Which collection to render. Reads `collection.custom.ogImage` from
   * the sanitized config to decide whether to opt into generated OG
   * images. When the field is missing, the route returns `undefined`
   * and Next.js falls through to the existing `<meta>` tag rendering.
   */
  collectionSlug: string

  /**
   * Name of the route param holding the doc identifier. Default `'slug'`.
   * Use `'id'` for numeric/UUID primary keys. If the param value parses
   * to a finite number, the factory fetches by numeric `id`; otherwise
   * it falls back to a `find` query against the slug field.
   */
  slugParam?: string

  /**
   * Name of the route param holding the locale (e.g. `'locale'` from
   * a `[locale]` segment). Default `'locale'`. When absent or empty,
   * the doc is fetched in Payload's default locale.
   */
  localeParam?: string

  /**
   * Image dimensions. Default `1200x630` — the canonical OG image size
   * used by Facebook, LinkedIn, and Twitter. Set both fields together.
   */
  size?: { width: number; height: number }

  /**
   * Output MIME. Default `'image/png'`. Switch to `'image/jpeg'` for
   * photographic content (smaller files, no transparency).
   */
  contentType?: 'image/png' | 'image/jpeg'

  /**
   * Override the import map used to resolve `collection.custom.ogImage`.
   * Default: read from the sanitized Payload config. Hosts that build
   * their own import map (e.g. for swizzled modules) can pass it
   * directly here.
   */
  importMap?: ImportMap

  /**
   * Explicit React component override. When set, the factory renders
   * this component instead of resolving via `custom.ogImage` +
   * `importMap`. Useful when:
   *
   * - The host doesn't use Payload's import map indirection
   * - The OG component lives outside the collection config
   * - The host wants a different card per route (not per collection)
   *
   * The factory still uses `extractSEOMetaForImage` to derive props,
   * so the component receives the same shape either way.
   */
  component?: ComponentType<SEOMetaImageProps>

  /**
   * Fallback title when the meta group is empty. Default `'Untitled'`.
   * Overrides the `fallbackTitle` cascade inside `extractSEOMetaForImage`.
   */
  fallbackTitle?: string

  /**
   * Fallback description when the meta group is empty.
   */
  fallbackDescription?: string

  /**
   * Fallback image URL when no image is set on the meta group.
   */
  fallbackImage?: string

  /**
   * OG object type. `'article'` for posts (renders `publishedTime` /
   * `modifiedTime` when present); `'website'` (default) for everything
   * else.
   */
  type?: 'website' | 'article'

  /**
   * Fetch override for hosts that don't use the local Payload API
   * (REST/GraphQL proxies, custom auth layers, etc). Receives the
   * resolved slug/id + locale and must return a doc object with a
   * `.meta` field (or whatever the host wants to feed into
   * `extractSEOMetaForImage`).
   *
   * `payload` is `undefined` here — when `fetchDoc` is provided, the
   * factory does NOT initialize a Payload instance. The host can call
   * `getPayload` themselves if they need the local API, or use any
   * other data source.
   *
   * Default: `payload.findByID` (numeric id) or `payload.find` (slug).
   */
  fetchDoc?: (args: {
    id: string | number | undefined
    locale: string | undefined
    payload: undefined
    collectionSlug: string
    slugField: string
  }) => Promise<Record<string, unknown> | null>
}

/**
 * Build the default-export function for a Next.js `opengraph-image.tsx`
 * route file. Handles the full pipeline:
 *
 * 1. Reads `collection.custom.ogImage` from the sanitized Payload config.
 *    If missing, returns `undefined` (Next.js falls back to `<meta>`).
 * 2. Resolves the `'@module/path#exportName'` string via the host's
 *    Payload import map (or uses the explicit `component` override).
 * 3. Fetches the doc from Payload (local API by default).
 * 4. Runs `extractSEOMetaForImage(doc.meta)` to derive OG props.
 * 5. Returns `new ImageResponse(<Component {...props}>, size)`.
 *
 *   // app/(frontend)/[locale]/posts/[slug]/opengraph-image.tsx
 *   import config from '@payload-config'
 *   import { createOpenGraphImageRoute } from '@justanarthur/payload-plugin-seo/opengraph-image'
 *
 *   export const size = { width: 1200, height: 630 }
 *   export const contentType = 'image/png'
 *   export const alt = 'Open Graph image'
 *
 *   export default createOpenGraphImageRoute({
 *     collectionSlug: 'posts',
 *     config
 *   })
 */
export const createOpenGraphImageRoute =
  (args: CreateOpenGraphImageRouteArgs): OpenGraphImageRoute =>
  async (ctx) => {
    const slugParam = args.slugParam ?? 'slug'
    const localeParam = args.localeParam ?? 'locale'
    const size = args.size ?? { width: 1200, height: 630 }
    const contentType = args.contentType ?? 'image/png'

    const params = await ctx.params
    const rawSlug = toParamString(params[slugParam])
    const locale = toParamString(params[localeParam]) ?? undefined

    const sanitizedConfig = await args.config

    const collection = sanitizedConfig.collections?.find(
      (c): c is SanitizedCollectionConfig => c.slug === args.collectionSlug
    )

    // Escape hatch 1: explicit component wins over `custom.ogImage`.
    // Escape hatch 2: `custom.ogImage` is the import-map indirection.
    // If neither is set, return undefined and let Next.js fall through
    // to the host's `<meta property="og:image">` tag.
    let Component: ComponentType<SEOMetaImageProps> | undefined = args.component
    if (!Component) {
      const ogImagePath = getCollectionOGImagePath(collection)
      if (!ogImagePath) return undefined
      const importMap = args.importMap ?? sanitizedConfig.admin?.importMap
      if (!importMap) {
        // In dev, throw — a misconfigured route is a bug, not a silent
        // fallback. In production, return undefined and let Next.js
        // serve the meta tag instead of crashing the request.
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(
            `[payload-plugin-seo] Collection "${args.collectionSlug}" has custom.ogImage set but no import map was found. Pass \`importMap\` explicitly or ensure the host's Payload config exposes \`admin.importMap\`.`
          )
        }
        return undefined
      }
      // `getFromImportMap` is a one-liner payload-www ships; inline
      // copy here keeps the SEO plugin zero-dep on payload-www.
      // `admin.importMap` is Payload's internal type (object keyed by
      // `path#exportName` strings); treat it as a plain string-keyed
      // record so the index access type-checks.
      const importMapRecord = importMap as unknown as Record<string, unknown>
      const resolved = importMapRecord[ogImagePath.includes('#') ? ogImagePath : `${ogImagePath}#default`]
      if (!resolved) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(
            `[payload-plugin-seo] Collection "${args.collectionSlug}" declares custom.ogImage="${ogImagePath}" but no matching entry was found in the import map.`
          )
        }
        return undefined
      }
      Component = resolved as ComponentType<SEOMetaImageProps>
    }

    // Fetch the doc. Two paths:
    //  - `fetchDoc` provided: host owns the fetch. We do NOT initialize
    //    a Payload instance — the host might be using REST, GraphQL,
    //    a cached lookup, or a different auth strategy.
    //  - default: use the local Payload API. `findByID` for numeric
    //    ids (one query), `find` for slug strings (where-clause).
    let doc: Record<string, unknown> | null = null
    if (args.fetchDoc) {
      const numericId = toParamNumber(rawSlug)
      const slugField = slugParam === 'id' ? 'id' : slugParam
      doc = await args.fetchDoc({
        id: numericId ?? rawSlug,
        locale,
        payload: undefined, // host calls `getPayload` themselves if they need it
        collectionSlug: args.collectionSlug,
        slugField
      })
    } else {
      const payload = await getPayload({ config: sanitizedConfig })
      if (rawSlug !== undefined) {
        const numericId = toParamNumber(rawSlug)
        if (numericId !== undefined) {
          doc = (await payload.findByID({
            collection: args.collectionSlug,
            id: numericId,
            locale,
            draft: false,
            depth: 0
          })) as Record<string, unknown> | null
        } else {
          const result = await payload.find({
            collection: args.collectionSlug,
            draft: false,
            depth: 0,
            limit: 1,
            pagination: false,
            overrideAccess: false,
            where: { [slugParam]: { equals: rawSlug } },
            locale
          })
          doc = (result.docs?.[0] as Record<string, unknown> | undefined) ?? null
        }
      }
    }

    const meta = (doc?.meta ?? null) as Parameters<typeof extractSEOMetaForImage>[0]['meta']
    const fallbackTitle =
      args.fallbackTitle ?? (typeof doc?.title === 'string' ? doc.title : undefined)

    const props = extractSEOMetaForImage({
      meta,
      fallback: {
        title: fallbackTitle,
        description: args.fallbackDescription,
        image: args.fallbackImage
      },
      locale,
      type: args.type
    })

    const ImageResponseCtor = await loadImageResponse()
    // `ComponentType` is `ComponentClass | FunctionComponent`. Calling
    // it directly type-checks only when TS narrows to FunctionComponent.
    // Use `createElement` to cover both — `Component(props)` would
    // fail at runtime for a class component without an explicit instance.
    const element = createElement(Component, props)
    return new ImageResponseCtor(element as never, {
      ...size,
      headers: { 'content-type': contentType }
    }) as unknown as ImageResponse
  }
