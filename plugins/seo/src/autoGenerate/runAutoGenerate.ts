import type { CollectionConfig, Field, GlobalConfig, PayloadRequest } from 'payload'

import { buildFieldPaths } from '../fields/buildFieldPaths'
import { MetaField } from '../fields/MetaField'
import { openaiMessage } from '../openai/message'
import type { GenerateSEO, SEOMeta, SEOPluginConfig } from '../types'
import { extractMetaFromScalars } from './extractMeta'


export type RunAutoGenerateOptions = {

  pluginConfig: SEOPluginConfig

  collectionConfig: CollectionConfig | undefined

  globalConfig?: GlobalConfig | undefined

  data: Record<string, unknown>

  operation: 'create' | 'update'

  locale: string | undefined

  req: PayloadRequest
}


const getAtPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}


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


export const runAutoGenerate = async (opts: RunAutoGenerateOptions): Promise<Record<string, unknown>> => {
  const { pluginConfig, collectionConfig, globalConfig, data, operation, locale, req } = opts


  const schemaConfig = (collectionConfig ?? (globalConfig as CollectionConfig | undefined)) as
    | CollectionConfig
    | undefined
  const agRaw = pluginConfig?.autoGenerate
  if (agRaw === false || agRaw === undefined || agRaw === null) return data
  const ag = agRaw
  if (ag.mode === 'off') return data


  if (ag.mode === 'onCreate' && operation !== 'create') return data
  if (ag.mode === 'onUpdate' && operation !== 'update') return data

  const onlyFillEmpty = ag.onlyFillEmpty !== false
  const timeoutMs = typeof ag.timeoutMs === 'number' ? ag.timeoutMs : 8000
  const rawFieldPaths = buildMetaFieldPaths(pluginConfig)




  const fieldPaths: Record<string, string> = Object.fromEntries(
    Object.entries(rawFieldPaths).map(([k, v]) => [k, `meta.${v}`])
  )


  const heuristicMeta = extractMetaFromScalars({
    data,
    collectionConfig: schemaConfig,
    locale,
    deriveFrom: ag.deriveFrom
  })

  applyMeta({ data, meta: heuristicMeta, fieldPaths, onlyFillEmpty })


  const hasGenerator =
    typeof pluginConfig?.generateSEO === 'function' || typeof pluginConfig?.openaiApiKey === 'string'


  if (ag.runGenerator === true && hasGenerator) {
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


      if (err instanceof Error) req.payload.logger.error(`[seo] autoGenerate: ${err.message}`)
    }

    applyMeta({ data, meta: generatedMeta, fieldPaths, onlyFillEmpty })
  }


  fillSecondarySlots({ data, meta: heuristicMeta, fieldPaths, onlyFillEmpty })

  return data
}