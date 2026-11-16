import type { CollectionConfig, Field, SanitizedConfig } from 'payload'
import { queryGlobal } from '../metadata/query'
import type { CollectionDocEntry } from '../pages/createCollectionPageExports'
import {
  fieldsToMarkdown,
  lexicalToPlainText,
  type RichTextToMarkdown,
  type SerializeBlock
} from './fieldsToMarkdown'
import { type LlmsDocument, type LlmsLink, renderLlmsFullTxt, renderLlmsTxt } from './renderLlmsTxt'

/**
 * A collection to list. `generateSitemap` from `createCollectionPageExports` already is one —
 * pass the same functions the sitemap index gets.
 */
export type LlmsSource = {
  collectionSlug: string
  payloadConfig: SanitizedConfig | Promise<SanitizedConfig>
  getRouting: () => Promise<{ locales: string[]; defaultLocale: string }>
  listDocs: (locale?: string) => Promise<CollectionDocEntry[]>
  getServerSideURL: () => string
}

export type LlmsTxtOptions = {
  /** `# heading`. Falls back to the `metadata` global's site name, then the host name. */
  name?: string
  /** `> summary` line. Falls back to the `metadata` global's site description. */
  summary?: string
  /** Markdown between the summary and the first section. */
  details?: string
  /** Locale whose documents and URLs are listed. Defaults to the served default locale. */
  locale?: string
  /** Print the served locales under the summary. Default `true`. */
  showLocales?: boolean
  /** Section heading per collection slug, or `false` to leave the collection out. Defaults to the collection's plural label. */
  sections?: Record<string, string | false>
  /** Documents to leave out, by id, slug, URL path (`/pricing`) or absolute URL. */
  exclude?: (string | number)[]
  /** Markdown appended after the generated sections, e.g. an `## Optional` list. */
  extra?: string
  /**
   * Slug of the editable settings global (`createLlmsGlobal` from
   * `@justanarthur/payload-plugin-seo/globals`). Its non-empty values win over these options.
   * Read only when the config has a global with that slug. Default `'llms'`; `false` skips it.
   */
  globalSlug?: string | false
}

export type LlmsFullTxtOptions = LlmsTxtOptions & {
  /** Overrides the markdown of one layout block; return `undefined` for the generic output. */
  serializeBlock?: SerializeBlock
  /** Overrides rich text conversion. Defaults to `convertLexicalToMarkdown` with the field's own editor config. */
  richTextToMarkdown?: RichTextToMarkdown
}

/** Shape of the global created by `createLlmsGlobal`. */
export type LlmsGlobalData = {
  siteName?: string | null
  summary?: string | null
  details?: string | null
  showLocales?: boolean | null
  collections?: { collection?: string | null; title?: string | null; exclude?: boolean | null }[] | null
  exclude?: { value?: string | null }[] | null
  extra?: string | null
}

export const LLMS_GLOBAL_DEFAULT_SLUG = 'llms'
const METADATA_GLOBAL_SLUG = 'metadata'

const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8' }

/** Route handler for `app/llms.txt/route.ts` — see https://llmstxt.org. */
export function createLlmsTxtFromCollections(sources: LlmsSource[], options: LlmsTxtOptions = {}) {
  return async function GET() {
    return new Response(renderLlmsTxt(await buildLlmsDocument(sources, options)), { headers: TEXT_HEADERS })
  }
}

/** Route handler for `app/llms-full.txt/route.ts`: the llms.txt index with every page's content inlined. */
export function createLlmsFullTxtFromCollections(sources: LlmsSource[], options: LlmsFullTxtOptions = {}) {
  return async function GET() {
    return new Response(renderLlmsFullTxt(await buildLlmsDocument(sources, options, true)), { headers: TEXT_HEADERS })
  }
}

const filled = (value: unknown) => typeof value === 'string' && value.trim() ? value : undefined

export async function buildLlmsDocument(
  sources: LlmsSource[],
  options: LlmsFullTxtOptions,
  full = false
): Promise<LlmsDocument> {
  if (sources.length === 0) throw new Error('[payload-www] createLlmsTxtFromCollections needs at least one collection')
  const [first] = sources
  const config = await first.payloadConfig
  const routing = await first.getRouting()
  const locale = options.locale && routing.locales.includes(options.locale) ? options.locale : routing.defaultLocale

  const hasGlobal = (slug: string) => config.globals?.some(global => global.slug === slug)
  const readGlobal = async <T>(slug: string | false | undefined) =>
    slug && hasGlobal(slug) ? (await queryGlobal({ globalSlug: slug, locale, depth: 0 })) as T | null : null

  const globalSlug = options.globalSlug ?? LLMS_GLOBAL_DEFAULT_SLUG
  const [settings, metadata] = await Promise.all([
    readGlobal<LlmsGlobalData>(globalSlug),
    readGlobal<{ shared?: { name?: string | null; description?: string | null } | null }>(METADATA_GLOBAL_SLUG)
  ])

  const sectionRows = new Map(
    (settings?.collections ?? []).filter(row => row.collection).map(row => [row.collection!, row])
  )
  const excluded = new Set([
    ...(options.exclude ?? []).map(String),
    ...(settings?.exclude ?? []).map(row => row.value?.trim()).filter((v): v is string => !!v)
  ].map(normalizePath))

  const toMarkdown = full ? await richTextConverter(options.richTextToMarkdown) : undefined

  const sections = await Promise.all(sources.map(async source => {
    const row = sectionRows.get(source.collectionSlug)
    const fromOptions = options.sections?.[source.collectionSlug]
    if (row?.exclude || (fromOptions === false && !row?.title)) return null

    const collection = config.collections?.find(c => c.slug === source.collectionSlug)
    const title = filled(row?.title) ?? (typeof fromOptions === 'string' ? fromOptions : undefined)
      ?? collectionLabel(collection, source.collectionSlug, locale)

    const entries = (await source.listDocs(locale))
      .filter(entry => !isExcluded(entry, excluded))
      .sort((a, b) => a.url.localeCompare(b.url))

    const links = entries.map((entry): LlmsLink => {
      // payload defaults useAsTitle to 'id', which is no title
      const useAsTitle = collection?.admin?.useAsTitle
      const titleField = useAsTitle && useAsTitle !== 'id' ? useAsTitle : 'title'
      // the SEO plugin's `meta` group keeps title/description under its `content` tab
      const meta = (entry.doc.meta as { content?: { title?: string; description?: string } } | undefined)?.content
      return {
        title: filled(meta?.title) ?? filled(entry.doc[titleField]) ?? entry.url,
        url: entry.url,
        description: filled(meta?.description),
        content: toMarkdown && collection
          ? fieldsToMarkdown({
            fields: collection.fields.filter(field => !('name' in field) || field.name !== titleField) as Field[],
            data: entry.doc,
            blocks: config.blocks,
            serializeBlock: options.serializeBlock,
            richTextToMarkdown: toMarkdown
          })
          : undefined
      }
    })

    return { title, links }
  }))

  return {
    name: filled(settings?.siteName) ?? filled(options.name) ?? filled(metadata?.shared?.name)
      ?? new URL(first.getServerSideURL()).hostname,
    summary: filled(settings?.summary) ?? filled(options.summary) ?? filled(metadata?.shared?.description),
    details: filled(settings?.details) ?? options.details,
    locales: (settings?.showLocales ?? options.showLocales ?? true) ? routing.locales : undefined,
    sections: sections.filter(section => section !== null),
    extra: filled(settings?.extra) ?? options.extra
  }
}

function normalizePath(value: string) {
  return value.length > 1 ? value.replace(/\/+$/, '') : value
}

function isExcluded(entry: CollectionDocEntry, excluded: Set<string>) {
  if (excluded.size === 0) return false
  const { pathname } = new URL(entry.url)
  return [String(entry.doc.id), entry.doc.slug, entry.url, pathname]
    .some(key => typeof key === 'string' && excluded.has(normalizePath(key)))
}

function collectionLabel(collection: CollectionConfig | undefined, slug: string, locale: string) {
  const plural = collection?.labels?.plural
  if (typeof plural === 'string') return plural
  if (plural && typeof plural === 'object') {
    const labels = plural as Record<string, string>
    const label = labels[locale] ?? labels.en ?? Object.values(labels)[0]
    if (label) return label
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ')
}

async function richTextConverter(override?: RichTextToMarkdown): Promise<RichTextToMarkdown> {
  if (override) return override
  // loaded only for llms-full.txt; a non-lexical editor or an unknown node falls back to plain text
  const { convertLexicalToMarkdown, editorConfigFactory } = await import('@payloadcms/richtext-lexical')
  return ({ field, data }) => {
    try {
      return convertLexicalToMarkdown({ data: data as never, editorConfig: editorConfigFactory.fromField({ field }) })
    } catch {
      return lexicalToPlainText(data)
    }
  }
}
