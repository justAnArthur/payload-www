import type { Field } from 'payload'
import type { CollectionDocEntry } from '../pages/createCollectionPageExports'
import type { PagePathPrefix, RoutingConfig } from '../pages/utils/buildLocalizedPath'
import { richTextConverter, type LlmsSource } from './createLlmsTxt'
import { fieldsToMarkdown, type RichTextToMarkdown, type SerializeBlock } from './fieldsToMarkdown'
import { createLinkResolver } from './linkResolver'

/** A collection whose pages get a Markdown version. `generateSitemap` from `createCollectionPageExports` already is one. */
export type MarkdownSource = LlmsSource & {
  findDoc: (pathname: string) => Promise<CollectionDocEntry | null>
  pathPrefix?: PagePathPrefix
}

export type MarkdownPagesOptions = {
  /** Overrides the markdown of one layout block; return `undefined` for the generic output (`''` drops it). */
  serializeBlock?: SerializeBlock
  /** Overrides rich text conversion. Defaults to `convertLexicalToMarkdown` with the field's own editor config. */
  richTextToMarkdown?: RichTextToMarkdown
  /** Paths answered as missing although a document exists, by URL path (`/pricing`) or absolute URL. */
  exclude?: string[]
  /** Markdown appended to every page, e.g. a pointer to `/llms.txt`. */
  append?: string | ((entry: CollectionDocEntry) => string | undefined)
  /** Body of the 404 answer. Defaults to a short note with links to `/llms.txt` and `/sitemap.xml`. */
  notFound?: string | ((pathname: string) => string)
  /** `Cache-Control` of both answers. Default: an hour on the CDN, a day stale while it refreshes. */
  cacheControl?: string
}

export type MarkdownRouteContext = { params: Promise<{ path?: string[] }> }

const DEFAULT_CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'

/**
 * Route handler that answers with a page's content as Markdown, for agents that send
 * `Accept: text/markdown`. Mount it on an optional catch-all (`app/markdown/[[...path]]/route.ts`)
 * and rewrite those requests to it from the middleware, so the page URL stays the same: the
 * rewritten path never serves HTML, so a CDN keying on the path can't mix the two up.
 * A path that is no document's canonical URL gets a Markdown 404.
 */
export function createMarkdownFromCollections(sources: MarkdownSource[], options: MarkdownPagesOptions = {}) {
  if (sources.length === 0) throw new Error('[payload-www] createMarkdownFromCollections needs at least one collection')

  return async function GET(_request: Request, { params }: MarkdownRouteContext) {
    const pathname = '/' + ((await params).path ?? []).join('/')
    const markdown = await renderMarkdownPage(sources, pathname, options)
    const headers: Record<string, string> = {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      'Cache-Control': options.cacheControl ?? DEFAULT_CACHE_CONTROL
    }

    if (!markdown) {
      return new Response(notFoundBody(sources[0].getServerSideURL(), pathname, options.notFound), { status: 404, headers })
    }
    return new Response(markdown.body, { headers: { ...headers, Link: `<${markdown.url}>; rel="canonical"` } })
  }
}

/** The Markdown version of the page at `pathname`, or `null` when no document is served there. */
export async function renderMarkdownPage(
  sources: MarkdownSource[], pathname: string, options: MarkdownPagesOptions = {}
): Promise<{ body: string; url: string } | null> {
  const siteUrl = sources[0].getServerSideURL()
  const excluded = new Set((options.exclude ?? []).map(value => trimPath(value.startsWith(siteUrl) ? value.slice(siteUrl.length) : value)))
  if (excluded.has(trimPath(pathname))) return null

  // collections can share a path shape (pages and posts both catch `/x` without a prefix), so
  // the first one with a document at this exact canonical URL wins
  let found: { source: MarkdownSource; entry: CollectionDocEntry } | undefined
  for (const source of sources) {
    const entry = await source.findDoc(pathname)
    if (entry) {
      found = { source, entry }
      break
    }
  }
  if (!found) return null

  const { source, entry } = found
  const config = await source.payloadConfig
  const routing = await source.getRouting() as RoutingConfig
  const locale = localeOf(entry.url, siteUrl, routing)
  const collection = config.collections?.find(c => c.slug === source.collectionSlug)
  if (!collection) return null

  const resolveLink = createLinkResolver({
    siteUrl,
    locale,
    routing,
    pathPrefixes: Object.fromEntries(sources.map(s => [s.collectionSlug, s.pathPrefix]))
  })
  const useAsTitle = collection.admin?.useAsTitle
  const titleField = useAsTitle && useAsTitle !== 'id' ? useAsTitle : 'title'
  const content = fieldsToMarkdown({
    fields: collection.fields.filter(field => !('name' in field) || field.name !== titleField) as Field[],
    data: entry.doc,
    blocks: config.blocks,
    serializeBlock: options.serializeBlock,
    resolveLink,
    richTextToMarkdown: await richTextConverter(options, config.blocks, resolveLink)
  }).trim()

  // the page's own top heading is its title; without one the document title stands in
  const title = typeof entry.doc[titleField] === 'string' ? entry.doc[titleField].trim() : ''
  const heading = firstHeadingLevel(content) === 1 || !title ? '' : `# ${title.replace(/\s+/g, ' ')}`
  const appended = typeof options.append === 'function' ? options.append(entry) : options.append

  const body = [heading, content, appended?.trim()].filter(Boolean).join('\n\n') + '\n'
  return { body, url: entry.url }
}

function notFoundBody(siteUrl: string, pathname: string, notFound: MarkdownPagesOptions['notFound']) {
  const custom = typeof notFound === 'function' ? notFound(pathname) : notFound
  if (custom?.trim()) return custom.trim() + '\n'
  const host = new URL(siteUrl).hostname.replace(/^www\./, '')
  return [
    '# Page not found',
    `This page does not exist on ${host}.`,
    `- Site overview for assistants: ${siteUrl}/llms.txt\n- Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n\n') + '\n'
}

function trimPath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

function localeOf(url: string, siteUrl: string, routing: RoutingConfig) {
  const first = url.slice(siteUrl.length).split('/').filter(Boolean)[0]
  return first && routing.locales.includes(first) ? first : routing.defaultLocale
}

// the level of the first heading outside fenced code, 0 when there is none
function firstHeadingLevel(markdown: string) {
  let fence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) fence = !fence
    else if (!fence) {
      const level = /^(#{1,6}) /.exec(line)?.[1].length
      if (level) return level
    }
  }
  return 0
}
