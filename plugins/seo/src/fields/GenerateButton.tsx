'use client'

import { useConfig, useDocumentInfo, useForm, useLocale, useTranslation } from '@payloadcms/ui'
import { reduceToSerializableFields } from '@payloadcms/ui/shared'
import React, { useCallback, useState } from 'react'
import type { UIField } from 'payload'

import type { PluginSEOTranslationKeys, PluginSEOTranslations } from '../translations'
import type { SEOMeta } from '../types'

type GenerateButtonProps = {
  /** Show the OpenAI button (when only `openaiApiKey` is configured). */
  readonly hasGenerateAi: boolean
  /** Show the custom-function button (when `generateSEO` is configured). */
  readonly hasGenerateFn: boolean
  /**
   * Path prefix to dispatch returned meta keys under. Defaults to `'meta'`.
   * The MetaField factory injects this based on the UI field's own path,
   * so the button works correctly even if the user nests the field deeper.
   */
  readonly pathPrefix?: string
  /**
   * Map of flat SEOMeta key → tab-qualified relative path, derived at build
   * time by MetaField from the actual tabs structure (e.g. `title → content.title`).
   * Falls back to the bare key when a key is not in the map.
   */
  readonly fieldPaths?: Record<string, string>
} & UIField

/**
 * Renders the "Generate" button(s) for the SEO group. One button per configured
 * source (`generateSEO` and/or `openaiApiKey`); each one POSTs the current doc
 * to the single `/plugin-seo/generate` endpoint and merges the returned
 * `meta` keys back into the form via `dispatchFields({ type: 'SET' })`.
 */
export const GenerateButton: React.FC<GenerateButtonProps> = ({
                                                                hasGenerateAi,
                                                                hasGenerateFn,
                                                                pathPrefix = 'meta',
                                                                fieldPaths = {}
                                                              }) => {
  const { t } = useTranslation<PluginSEOTranslations, PluginSEOTranslationKeys>()

  const {
    config: {
      routes: { api },
      serverURL
    }
  } = useConfig()

  const locale = useLocale()
  const docInfo = useDocumentInfo()
  const { dispatchFields, getData, setModified } = useForm()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runGenerate = useCallback(
    async (source: 'fn' | 'ai') => {
      if (isLoading) return
      setIsLoading(true)
      setError(null)
      try {
        const endpoint = `${serverURL}${api}/plugin-seo/generate`

        const response = await fetch(endpoint, {
          body: JSON.stringify({
            // Hint the server which generator to invoke.
            source,
            collectionSlug: docInfo.collectionSlug,
            doc: getData(),
            docPermissions: docInfo.docPermissions,
            globalSlug: docInfo.globalSlug,
            hasPublishPermission: docInfo.hasPublishPermission,
            hasPublishedDoc: docInfo.hasPublishedDoc,
            hasSavePermission: docInfo.hasSavePermission,
            id: docInfo.id,
            initialData: docInfo.initialData,
            initialState: docInfo.initialState
              ? reduceToSerializableFields(docInfo.initialState)
              : undefined,
            locale: typeof locale === 'object' ? locale?.code : locale,
            title: docInfo.title,
            versionCount: docInfo.versionCount
          }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const { meta } = (await response.json()) as { meta: Partial<SEOMeta> }

        // Merge the returned keys into the form, one dispatch per key.
        // Resolve each flat SEOMeta key to its tab-qualified path via the
        // fieldPaths map that was derived from the actual field structure in
        // MetaField.tsx — no hard-coding here.
        for (const [key, value] of Object.entries(meta ?? {})) {
          if (value === undefined) continue
          const tabPath = fieldPaths[key] ?? key
          dispatchFields({ path: `${pathPrefix}.${tabPath}`, type: 'UPDATE', value })
        }

        setModified(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setIsLoading(false)
      }
    },
    [
      api,
      dispatchFields,
      docInfo,
      fieldPaths,
      getData,
      isLoading,
      locale,
      pathPrefix,
      serverURL
    ]
  )

  if (!hasGenerateFn && !hasGenerateAi) {
    return null
  }

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}
    >
      {hasGenerateFn && (
        <button disabled={isLoading} onClick={() => void runGenerate('fn')} type="button">
          {isLoading ? t('plugin-seo:generating') : t('plugin-seo:autoGenerate')}
        </button>
      )}
      {hasGenerateAi && (
        <button disabled={isLoading} onClick={() => void runGenerate('ai')} type="button">
          {isLoading ? t('plugin-seo:generating') : t('plugin-seo:generateAi')}
        </button>
      )}
      {error && (
        <span style={{ color: 'var(--theme-error-500)' }}>
          {t('plugin-seo:generateError', { error })}
        </span>
      )}
    </div>
  )
}

