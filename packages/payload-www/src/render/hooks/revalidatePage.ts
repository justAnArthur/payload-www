import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
// `next/cache` is App-Router-only and must NOT be eagerly imported at the
// module top level. The lib's data collections (Pages, Header, Footer)
// re-export this factory from `data/collections/*` so that
// `payload.config.ts` (a Node entrypoint) ends up loading this module.
// Importing `next/cache` eagerly would chain it into the root barrel and
// break the build. We resolve it lazily inside the hook at request time,
// which is the only point the function is ever called in a real
// App Router context anyway.

export type RevalidatePageOptions = {
  homeSlug?: string
  nestedSlugDivider?: string
  sitemapTag?: string | null
}

/**
 * Build per-locale revalidation hooks for a page collection. Returns
 * `{ afterChange, afterDelete }` pair to attach to a Pages collection.
 */
export function createRevalidatePageHooks(options: RevalidatePageOptions = {}) {
  const homeSlug = options.homeSlug ?? ''
  const divider = options.nestedSlugDivider ?? '_'
  const sitemapTag = options.sitemapTag === undefined ? 'pages-sitemap' : options.sitemapTag

  const slugToPath = (slug: string | null | undefined, locale: string): string => {
    if (slug === homeSlug) return `/${locale}`
    if (divider && slug && slug.includes(divider)) {
      return `/${locale}/${slug.replaceAll(divider, '/')}`
    }
    return `/${locale}/${slug ?? ''}`
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidatePath, revalidateTag } = await import('next/cache')
    const typed = doc as { _status?: string; slug?: string | null }
    const prev = previousDoc as { _status?: string; slug?: string | null } | undefined
    const l = (locale as string) ?? ''
    if (typed._status === 'published') {
      const path = slugToPath(typed.slug, l)
      payload.logger.info(`Revalidating page at path: ${path}`)
      try {
        revalidatePath(path)
        if (sitemapTag) revalidateTag(sitemapTag, 'max')
      } catch (error) {
        payload.logger.error(`Error revalidating page ${path}: ${String(error)}`)
      }
    }
    if (prev?._status === 'published' && typed._status !== 'published') {
      const oldPath = slugToPath(prev.slug, l)
      payload.logger.info(`Revalidating old page at path: ${oldPath}`)
      try {
        revalidatePath(oldPath)
        if (sitemapTag) revalidateTag(sitemapTag, 'max')
      } catch (error) {
        payload.logger.error(`Error revalidating old page ${oldPath}: ${String(error)}`)
      }
    }
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req: { payload, context, locale } }) => {
    if (context.disableRevalidate) return doc
    const { revalidatePath, revalidateTag } = await import('next/cache')
    const typed = doc as { slug?: string | null } | null
    const l = (locale as string) ?? ''
    const path = slugToPath(typed?.slug, l)
    payload.logger.info(`Revalidating deleted page at path: ${path}`)
    try {
      revalidatePath(path)
      if (sitemapTag) revalidateTag(sitemapTag, 'max')
    } catch (error) {
      payload.logger.error(`Error revalidating deleted page ${path}: ${String(error)}`)
    }
    return doc ?? null
  }

  return { afterChange, afterDelete }
}
