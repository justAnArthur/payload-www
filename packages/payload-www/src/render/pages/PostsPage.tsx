import type { ReactElement } from 'react'

import { RichText } from '@payloadcms/richtext-lexical/react'

type PostsPageProps = {
  /**
   * The resolved post document. The host's `/blog/[...slug]/page.tsx`
   * route handler is responsible for fetching the doc (via Payload's
   * `getPayload` or via the lib's `createCollectionPageExports`'s
   * `generateMetadata` helper). This component just renders the
   * visual body.
   */
  doc: Record<string, any> | null
  /**
   * Resolved locale string (already validated upstream by the host's
   * `[locale]` route segment). Unused by this default render — kept
   * on the signature so hosts can swap in their own component
   * without changing the importMap entry.
   */
  locale: string
  /**
   * Payload's generated importMap. Reserved for hosts that want to
   * extend this component with custom Lexical converters via the
   * `RichText` `converters` prop. Not consumed by the default render.
   */
  importMap: Record<string, unknown>
}

/**
 * Default visual body for the Posts collection. Renders the doc's
 * `title`, optional `excerpt`, and `content` (Lexical richText)
 * via Payload's official `<RichText>` component.
 *
 * Hosts can replace this by setting a different `custom.path` on
 * their own Posts collection (via the lib's `createPostsCollection`
 * factory) and pointing it at their own Server Component.
 *
 * The lib's `<RichText>` import is the client-safe React renderer
 * from `@payloadcms/richtext-lexical/react` — no client component
 * here. The component serializes on the server.
 */
export async function PostsPage({ doc, locale, importMap: _importMap }: PostsPageProps): Promise<ReactElement> {
  if (!doc) return <></>
  const title = readText((doc as any).title, locale)
  const excerpt = readText((doc as any).excerpt, locale)
  const content = (doc as any).content

  return (
    <article className="posts-page prose prose-neutral dark:prose-invert mx-auto max-w-3xl py-10">
      <header className="posts-page__header not-prose mb-8">
        <h1 className="posts-page__title text-4xl font-semibold tracking-tight">{title}</h1>
        {excerpt ? (
          <p className="posts-page__excerpt mt-3 text-lg text-muted-foreground">{excerpt}</p>
        ) : null}
      </header>
      {content ? (
        <div className="posts-page__content">
          <RichText data={content} />
        </div>
      ) : null}
    </article>
  )
}

/**
 * Localized fields are stored as `{ en, uk }` per the lib's
 * `createPostsCollection`. The lib's page factory resolves them
 * before passing the doc in, but the SQLite + REST API in the demo
 * can sometimes serialize back to the raw object — defensive parse
 * keeps the title/excerpt render correctly in both cases. The
 * preferred locale (when present) wins over a "first value" fallback
 * so the post body matches the URL's locale.
 */
function readText(value: unknown, preferredLocale?: string): string {
  if (typeof value !== 'string') return ''
  if (!value.startsWith('{')) return value
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') return parsed
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (
        preferredLocale &&
        typeof obj[preferredLocale] === 'string' &&
        (obj[preferredLocale] as string).length > 0
      ) {
        return obj[preferredLocale] as string
      }
      const first = Object.values(obj).find((v) => typeof v === 'string' && v.length > 0)
      return typeof first === 'string' ? first : value
    }
    return value
  } catch {
    return value
  }
}