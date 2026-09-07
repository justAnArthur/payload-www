/**
 * Atomic cache-key vocabulary for Next.js Cache Components.
 *
 * The lib's own query layer emits these tags via `cacheTag(...)` inside `'use cache'`
 * scopes. Any revalidation strategy (the demo's reference plugin, a host-installed
 * `@pro-laico/payload-revalidate`, or a hand-rolled hook) MUST import from this
 * module — via `@justanarthur/payload-www/cache-keys` — to stay in sync with the
 * tags the lib actually writes. Hand-spelling tags silently no-ops.
 *
 * Vocabulary (see plan § 1):
 *   <collection>:<idFieldValue>     — e.g. pages:about_en
 *   <collection>:<idFieldValue>     — e.g. pages:about (alias, no locale)
 *   <collection>:list:<scope>       — e.g. pages:list:recent
 *   <collection>:join:<field>:<pid>  — e.g. posts:join:author:7
 *   global:<slug>                   — e.g. global:header
 *   <prefix>all                     — bust-everything tag
 *   <baseTag>:draft                 — draft lane variant
 */

export type CollectionCacheKeyArgs = {
  collectionSlug: string
  slug: string
  locale?: string
}

export type GlobalCacheKeyArgs = {
  globalSlug: string
  locale?: string
}

export type AliasCacheKeyArgs = {
  collectionSlug: string
  slug: string
  idField?: string
}

export type ListCacheKeyArgs = {
  collectionSlug: string
  scope?: string
  locale?: string
}

export type JoinCacheKeyArgs = {
  collectionSlug: string
  joinField: string
  parentId: string | number
}

export function createCollectionCacheKey(args: CollectionCacheKeyArgs): string {
  return `${args.collectionSlug}:${args.slug}${args.locale ? '_' + args.locale : ''}`
}

export function createAliasCacheKey(args: AliasCacheKeyArgs): string {
  const idField = args.idField ?? 'slug'
  return `${args.collectionSlug}:${idField}:${args.slug}`
}

export function createListCacheKey(args: ListCacheKeyArgs): string {
  const scope = args.scope ?? '_all'
  const localeSuffix = args.locale ? ':' + args.locale : ''
  return `${args.collectionSlug}:list:${scope}${localeSuffix}`
}

export function createJoinCacheKey(args: JoinCacheKeyArgs): string {
  return `${args.collectionSlug}:join:${args.joinField}:${args.parentId}`
}

export function createGlobalCacheKey(args: GlobalCacheKeyArgs): string {
  return `global:${args.globalSlug}${args.locale ? '_' + args.locale : ''}`
}

export function createAllCacheKey(prefix?: string): string {
  return prefix ? `${prefix}:all` : 'all'
}

export function createDraftCacheKey(baseTag: string): string {
  return `${baseTag}:draft`
}

export function prefixedTag(tag: string, prefix?: string): string {
  if (!prefix) return tag
  return `${prefix}:${tag}`
}
