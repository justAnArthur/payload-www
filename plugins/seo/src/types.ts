import type { DocumentInfoContext } from '@payloadcms/ui'
import type {
  CollectionConfig,
  CollectionSlug,
  Field,
  GlobalConfig,
  GlobalSlug,
  PayloadRequest,
} from 'payload'

/**
 * Override the default fields inserted by the SEO plugin via a function that
 * receives the default fields and returns the new fields.
 *
 * If you need more flexibility you can insert the fields manually as needed.
 */
export type FieldsOverride = (args: { defaultFields: Field[] }) => Field[]

export type PartialDocumentInfoContext = Pick<
  DocumentInfoContext,
  | 'collectionSlug'
  | 'docPermissions'
  | 'globalSlug'
  | 'hasPublishPermission'
  | 'hasPublishedDoc'
  | 'hasSavePermission'
  | 'id'
  | 'initialData'
  | 'initialState'
  | 'preferencesKey'
  | 'title'
  | 'versionCount'
>

/**
 * The full SEO meta object the plugin can manage.
 *
 * Every field is optional — `generateSEO` and the OpenAI fallback return
 * `Partial<SEOMeta>`, and the editor UI only writes back the keys that are
 * actually returned.
 */
export type SEOMeta = {
  // ----- Core -----
  /** Page title shown in search results & browser tab. ~50–60 chars. */
  title?: string
  /** Page description shown under the title in SERPs. ~100–150 chars. */
  description?: string
  /** Comma-separated keywords (legacy meta tag, still useful for some crawlers). */
  keywords?: string
  /** Social share / SERP thumbnail. */
  image?: any // TODO: narrow to a relationship once payload-types settle

  // ----- Open Graph (Facebook, LinkedIn, Slack, Discord, ...) -----
  ogTitle?: string
  ogDescription?: string
  ogImage?: any
  ogType?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'
  ogUrl?: string
  ogSiteName?: string
  ogLocale?: string

  // ----- Twitter Card -----
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: any
  twitterSite?: string
  twitterCreator?: string

  // ----- Advanced -----
  /** Canonical URL — overrides auto-derived URL. */
  canonicalUrl?: string
  /** Free-form `meta robots` content, e.g. "index, follow" or "noindex, nofollow". */
  robots?: string
  /** Article / page author, free-form. */
  author?: string
  /** ISO-8601 publish time, surfaced for article OG. */
  publishedAt?: string
  /** ISO-8601 modified time, surfaced for article OG. */
  modifiedAt?: string
}

/**
 * Single generation function. Receives the full entity (collection doc or
 * global) plus request context; returns a `Partial<SEOMeta>` containing the
 * keys you want to fill in (commonly title / description / keywords / image).
 *
 * This is the only place generation logic lives — call OpenAI, Anthropic, your
 * own model, a heuristic, or a static fallback. The plugin just ships the
 * result back to the editor and merges it into the form state.
 */
export type GenerateSEO<T = any> = (
  args: {
    collectionConfig?: CollectionConfig
    doc: T
    globalConfig?: GlobalConfig
    locale?: string
    req: PayloadRequest
  } & PartialDocumentInfoContext,
) => Promise<Partial<SEOMeta>> | Partial<SEOMeta>

export type SEOPluginConfig = {
  /**
   * Collections to include the SEO group field in.
   */
  collections?: CollectionSlug[]
  /**
   * Override the default fields inserted by the SEO plugin via a function
   * that receives the default fields and returns the new fields.
   */
  fields?: FieldsOverride
  /**
   * Single generation function — receives the entity, returns the meta
   * keys you want to fill. If omitted, the editor's "Generate" button is
   * hidden unless `openaiApiKey` is also set.
   */
  generateSEO?: GenerateSEO
  /**
   * Globals to include the SEO group field in.
   */
  globals?: GlobalSlug[]
  /**
   * TypeScript interface name generated for the `meta` group. Lets the rest
   * of your app type the meta object directly.
   */
  interfaceName?: string
  /**
   * OpenAI API key. When set and `generateSEO` is not provided, the plugin
   * uses OpenAI directly with a default prompt to fill in
   * title / description / keywords. Prefer providing your own `generateSEO`
   * for prompt control.
   * @link https://platform.openai.com/docs/guides/authentication
   */
  openaiApiKey?: string
  /**
   * Group fields into tabs — your content will be put in a Content tab and
   * the SEO fields in an SEO tab.
   */
  tabbedUI?: boolean

  /**
   * The slug of the collection used to handle image uploads. Required for
   * the meta `image` field to render as an upload picker.
   */
  uploadsCollection?: CollectionSlug
}
