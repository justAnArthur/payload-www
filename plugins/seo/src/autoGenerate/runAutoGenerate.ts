import type { CollectionConfig, Field, GlobalConfig, PayloadRequest } from 'payload'

import { buildFieldPaths } from '../fields/buildFieldPaths'
import { MetaField } from '../fields/MetaField'
import { openaiMessage } from '../openai/message'
import type { DeriveFrom, GenerateSEO, SEOMeta, SEOPluginConfig } from '../types'
import { extractScalars, lexicalToPlainText, type ExtractedDoc } from './extractScalars'

/**
 * Path-internal — the shape consumers pass in. The public surface
 * (`autoGenerate` on `SEOPluginConfig`) is defined in `types.ts`.
 */
export type RunAutoGenerateOptions = {
  /** Plugin config; we read `generateSEO`, `openaiApiKey`, `autoGenerate`. */
  pluginConfig: SEOPluginConfig
  /** Collection whose `beforeChange` is firing (drives the schema walk). */
  collectionConfig: CollectionConfig | undefined
  /** Global whose `beforeChange` is firing (alternative to `collectionConfig`). */
  globalConfig?: GlobalConfig | undefined
  /** The doc being saved — mutable. We write back into `data.meta`. */
  data: Record<string, unknown>
  /** `'create'` on first save, `'update'` on subsequent. */
  operation: 'create' | 'update'
  /** Active locale for localized fields. Falls back to first-non-empty. */
  locale: string | undefined
  /** Request context — passed to the user `generateSEO` and OpenAI fallback. */
  req: PayloadRequest
}

/** Type guard for "is this a non-empty string-like scalar?" */
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** Get a value at a dot-separated path. Returns undefined for missing keys. */
const getAtPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

/** Set a value at a dot-separated path, creating nested objects as needed. */
const setAtPath = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    const next = cur[p]
    if (next === null || next === undefined || typeof next !== 'object') {
      cur[p] = {}
    }
    cur = cur[p] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/** Tokenize plaintext, drop stopwords + short tokens, return top N by frequency. */
const deriveKeywords = (text: string, limit = 8): string => {
  if (text.length === 0) return ''
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'as', 'this', 'that', 'these',
    'those', 'it', 'its', 'we', 'you', 'they', 'i', 'he', 'she', 'our', 'your', 'their',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could',
    'may', 'might', 'shall', 'not', 'no', 'if', 'so', 'than', 'then', 'also', 'just', 'about'
  ])
  const counts = new Map<string, number>()
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 4 || stop.has(raw)) continue
    counts.set(raw, (counts.get(raw) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w).join(', ')
}

/**
 * The mapping rules for `'allScalars'` mode. Each rule returns a value or
 * `undefined` if no match. First non-undefined wins.
 *
 * Field-name matching is intentionally case-insensitive and uses word
 * boundaries — `title` matches `pageTitle`, `seoTitle`, `Title`, etc.
 */
const matchTitle = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value !== 'string') continue
    if (/\btitle\b/i.test(name) && value.length > 0) return value
  }
  // Fallback: first non-empty text scalar, in document order.
  for (const value of Object.values(extracted.scalarsByName)) {
    if (isNonEmptyString(value)) return value
  }
  return undefined
}

const matchDescription = (extracted: ExtractedDoc, maxLen = 155): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value !== 'string') continue
    if (/\b(description|excerpt|summary|lead|intro)\b/i.test(name) && value.length > 0) {
      return value.length > maxLen ? `${value.slice(0, maxLen - 1).trimEnd()}…` : value
    }
  }
  // Fallback: first 155 chars of any richText body, then first 155 chars of
  // any non-empty text scalar, then the joined plain text.
  for (const value of Object.values(extracted.scalarsByName)) {
    if (typeof value === 'object' && value !== null && '__lexical' in value) {
      const text = (value as { __lexical: string }).__lexical
      if (text.length > 0) {
        return text.length > maxLen ? `${text.slice(0, maxLen - 1).trimEnd()}…` : text
      }
    }
  }
  if (extracted.allPlainText.length > 0) {
    return extracted.allPlainText.length > maxLen
      ? `${extracted.allPlainText.slice(0, maxLen - 1).trimEnd()}…`
      : extracted.allPlainText
  }
  return undefined
}

const matchImage = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value === 'object' && value !== null && '__relation' in value) {
      return (value as { __relation: string }).__relation
    }
  }
  return extracted.firstImageId
}

const matchKeywords = (extracted: ExtractedDoc): string | undefined => {
  for (const [name, value] of Object.entries(extracted.scalarsByName)) {
    if (typeof value === 'string' && /keyword/i.test(name) && value.length > 0) return value
  }
  return deriveKeywords(extracted.allPlainText) || undefined
}

/**
 * Build a `Partial<SEOMeta>` from the doc using the heuristic mapping rules.
 * Only returns keys that have a value — empty slots are skipped so the
 * merge step can decide whether to keep what's already there or fill in.
 */
const runHeuristic = ({
  data,
  extracted
}: {
  data: Record<string, unknown>
  extracted: ExtractedDoc
}): Partial<SEOMeta> => {
  const out: Partial<SEOMeta> = {}

  // The user can pin a value explicitly via `data.meta.<key>` already
  // filled in — the heuristic only acts when the active path is empty.
  // We read those `already filled` slots here so the merge step doesn't
  // overwrite them later.

  const title = matchTitle(extracted)
  if (isNonEmptyString(title)) out.title = title

  const description = matchDescription(extracted)
  if (isNonEmptyString(description)) out.description = description

  const image = matchImage(extracted)
  if (image) out.image = image

  const keywords = matchKeywords(extracted)
  if (isNonEmptyString(keywords)) out.keywords = keywords

  return out
}

/**
 * Read the user-provided `deriveFrom` map against the doc — same shape the
 * existing `generateSEO` returns, but using only the named source fields.
 * Localized fields are flattened to the active locale.
 */
const runExplicitDeriveFrom = ({
  data,
  deriveFrom,
  collectionConfig,
  locale
}: {
  data: Record<string, unknown>
  deriveFrom: DeriveFrom
  collectionConfig: CollectionConfig | undefined
  locale: string | undefined
}): Partial<SEOMeta> => {
  if (typeof deriveFrom !== 'object' || Array.isArray(deriveFrom)) return {}
  const out: Partial<SEOMeta> = {}

  // Build a lookup: source field name → whether it's localized.
  const isLocalized = (name: string): boolean => {
    if (!collectionConfig) return false
    const find = (fs: Field[] | undefined): boolean => {
      if (!fs) return false
      for (const f of fs) {
        const fn = f as Field & { name?: string; fields?: Field[]; localized?: boolean; tabs?: { fields: Field[] }[] }
        if (fn.name === name) return Boolean(fn.localized)
        if (fn.fields && find(fn.fields)) return true
        if (fn.tabs) for (const t of fn.tabs) if (find(t.fields)) return true
      }
      return false
    }
    return find(collectionConfig.fields)
  }

  const read = (name: string): unknown => {
    const raw = (data as Record<string, unknown>)[name]
    if (raw === undefined || raw === null) return undefined
    if (!isLocalized(name)) return raw
    if (typeof raw !== 'object' || Array.isArray(raw)) return raw
    const obj = raw as Record<string, unknown>
    if (locale && obj[locale] !== undefined && obj[locale] !== '') return obj[locale]
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v.length > 0) return v
      if (typeof v === 'number') return v
    }
    return undefined
  }

  for (const [slot, source] of Object.entries(deriveFrom)) {
    if (!source || typeof source !== 'string') continue
    const value = read(source)
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.length === 0) continue

    // RichText plaintext path
    if (typeof value === 'object' && value !== null && 'root' in value) {
      const txt = lexicalToPlainText(value)
      if (txt.length > 0) (out as Record<string, unknown>)[slot] = txt
      continue
    }

    (out as Record<string, unknown>)[slot] = value
  }

  return out
}

/**
 * Mirror `meta.content.{title,description,image}` into the
 * `meta.social.social.{ogTitle,ogDescription,ogImage}` and
 * `meta.social.social.{twitterTitle,twitterDescription,twitterImage}` slots
 * when they're empty. This is the "no-API" win — empty social slots get
 * reasonable defaults without calling any generator.
 */
const fillSecondarySlots = ({
  data,
  meta,
  fieldPaths,
  onlyFillEmpty
}: {
  data: Record<string, unknown>
  meta: Partial<SEOMeta>
  fieldPaths: Record<string, string>
  onlyFillEmpty: boolean
}): void => {
  const pairs: Array<[keyof SEOMeta, keyof SEOMeta, keyof SEOMeta]> = [
    ['title', 'ogTitle', 'twitterTitle'],
    ['description', 'ogDescription', 'twitterDescription'],
    ['image', 'ogImage', 'twitterImage']
  ]
  for (const [primary, og, twitter] of pairs) {
    const primaryPath = fieldPaths[primary as string]
    const ogPath = fieldPaths[og as string]
    const twPath = fieldPaths[twitter as string]
    if (!primaryPath || !ogPath || !twPath) continue

    const primaryValue = getAtPath(data, primaryPath)
    const ogValue = getAtPath(data, ogPath)
    const twValue = getAtPath(data, twPath)
    const metaValue = meta[primary]

    const source = primaryValue ?? metaValue
    if (source === undefined || source === null || source === '') continue

    if (onlyFillEmpty) {
      if (ogValue === undefined || ogValue === null || ogValue === '') {
        setAtPath(data, ogPath, source)
      }
      if (twValue === undefined || twValue === null || twValue === '') {
        setAtPath(data, twPath, source)
      }
    } else {
      setAtPath(data, ogPath, source)
      setAtPath(data, twPath, source)
    }
  }
}

/** Apply a `Partial<SEOMeta>` onto `data` at the correct meta paths. */
const applyMeta = ({
  data,
  meta,
  fieldPaths,
  onlyFillEmpty
}: {
  data: Record<string, unknown>
  meta: Partial<SEOMeta>
  fieldPaths: Record<string, string>
  onlyFillEmpty: boolean
}): void => {
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null || value === '') continue
    const path = fieldPaths[key]
    if (!path) continue
    if (onlyFillEmpty) {
      const existing = getAtPath(data, path)
      if (existing === undefined || existing === null || existing === '') {
        setAtPath(data, path, value)
      }
    } else {
      setAtPath(data, path, value)
    }
  }
}

/** Race a promise against a timeout; resolve to `undefined` on timeout. */
const withTimeout = async <T>(p: Promise<T> | T, ms: number): Promise<T | undefined> => {
  if (typeof (p as Promise<T>)?.then !== 'function') return p as T
  return new Promise<T | undefined>((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      resolve(undefined)
    }, ms)
    ;(p as Promise<T>).then(
      (v) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(v)
      },
      () => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(undefined)
      }
    )
  })
}

/**
 * Build the flat-key → tab-qualified-path mapping used for writing meta
 * values back into `data.meta`. We instantiate `MetaField` once to get the
 * structure (it has no runtime side effects — it's a pure schema builder)
 * and pass the result through `buildFieldPaths`.
 */
const buildMetaFieldPaths = (pluginConfig: SEOPluginConfig): Record<string, string> => {
  const hasGenerateAi = typeof pluginConfig?.openaiApiKey === 'string'
  const hasGenerateFn = typeof pluginConfig?.generateSEO === 'function'
  const meta = MetaField({
    hasGenerateAi,
    hasGenerateFn,
    relationTo: pluginConfig.uploadsCollection,
    interfaceName: pluginConfig.interfaceName
  }) as unknown as { fields?: Field[] }
  const tabsField = (meta.fields ?? []).find((f) => f.type === 'tabs') as
    | (Field & { tabs?: { fields: Field[]; name?: string }[] })
    | undefined
  return buildFieldPaths((tabsField?.tabs ?? []) as never)
}

/**
 * The hook body. Reads `pluginConfig.autoGenerate`, runs the heuristic and
 * (if configured) the LLM generator, merges results into `data.meta`,
 * returns the (mutated) data.
 */
export const runAutoGenerate = async (opts: RunAutoGenerateOptions): Promise<Record<string, unknown>> => {
  const { pluginConfig, collectionConfig, globalConfig, data, operation, locale, req } = opts
  // The extractor reads `fields` from either collection or global — both
  // shapes expose the same `fields: Field[]` array.
  const schemaConfig = (collectionConfig ?? (globalConfig as CollectionConfig | undefined)) as
    | CollectionConfig
    | undefined
  const agRaw = pluginConfig?.autoGenerate
  if (agRaw === false || agRaw === undefined || agRaw === null) return data
  const ag = agRaw
  if (ag.mode === 'off') return data

  // Mode gate.
  if (ag.mode === 'onCreate' && operation !== 'create') return data
  if (ag.mode === 'onUpdate' && operation !== 'update') return data

  const onlyFillEmpty = ag.onlyFillEmpty !== false
  const timeoutMs = typeof ag.timeoutMs === 'number' ? ag.timeoutMs : 8000
  const rawFieldPaths = buildMetaFieldPaths(pluginConfig)
  // `buildFieldPaths` returns paths relative to the `meta` group
  // (e.g. `content.title`). The client-side `GenerateButton` uses the
  // same paths with `pathPrefix: 'meta'` to construct `meta.content.title`.
  // We mirror that here for server-side reads/writes.
  const fieldPaths: Record<string, string> = Object.fromEntries(
    Object.entries(rawFieldPaths).map(([k, v]) => [k, `meta.${v}`])
  )

  // ----- Heuristic / explicit-deriveFrom pass -----
  let heuristicMeta: Partial<SEOMeta> = {}
  const deriveFrom = ag.deriveFrom

  if (deriveFrom && typeof deriveFrom === 'object' && !Array.isArray(deriveFrom)) {
    heuristicMeta = runExplicitDeriveFrom({
      data,
      deriveFrom,
      collectionConfig: schemaConfig,
      locale
    })
  } else {
    // Default: 'allScalars'. Extract everything the schema exposes, then
    // apply the mapping rules.
    const extracted = extractScalars({ doc: data, collectionConfig: schemaConfig, locale })
    heuristicMeta = runHeuristic({ data, extracted })
  }

  applyMeta({ data, meta: heuristicMeta, fieldPaths, onlyFillEmpty })

  // ----- Generator pass (only if user provided one or OpenAI is configured) -----
  const hasGenerator =
    typeof pluginConfig?.generateSEO === 'function' || typeof pluginConfig?.openaiApiKey === 'string'

  if (hasGenerator) {
    const baseArgs = {
      collectionConfig,
      doc: data,
      locale,
      req
    } as Parameters<GenerateSEO>[0]

    let generatedMeta: Partial<SEOMeta> = {}
    try {
      if (typeof pluginConfig?.generateSEO === 'function') {
        generatedMeta =
          ((await withTimeout(Promise.resolve(pluginConfig.generateSEO(baseArgs)), timeoutMs)) as
            | Partial<SEOMeta>
            | undefined) ?? {}
      } else if (typeof pluginConfig?.openaiApiKey === 'string') {
        const content = JSON.stringify(data)
        generatedMeta =
          ((await withTimeout(
            openaiMessage({
              apiKey: pluginConfig.openaiApiKey,
              content,
              req
            }),
            timeoutMs
          )) as Partial<SEOMeta> | undefined) ?? {}
      }
    } catch (err) {
      // Never let a generator failure block the save. Log and continue
      // with whatever the heuristic produced.
      if (err instanceof Error) req.payload.logger.error(`[seo] autoGenerate: ${err.message}`)
    }

    applyMeta({ data, meta: generatedMeta, fieldPaths, onlyFillEmpty })
  }

  // ----- Secondary slots: title → ogTitle/twitterTitle, etc. -----
  fillSecondarySlots({ data, meta: heuristicMeta, fieldPaths, onlyFillEmpty })

  return data
}
