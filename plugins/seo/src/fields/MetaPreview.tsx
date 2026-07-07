'use client'

import { useAllFormFields, useConfig, useForm, useLocale, useTranslation } from '@payloadcms/ui'
import type { FormField, UIField } from 'payload'
import React, { useEffect, useMemo, useState } from 'react'

import type { PluginSEOTranslationKeys, PluginSEOTranslations } from '../translations'

type PreviewProps = {

  readonly pathPrefix?: string

  readonly fieldPaths?: Record<string, string>
} & UIField

type GlobalMetadataRaw = {
  shared?: {
    name?: string | Record<string, string | undefined> | null
    description?: string | Record<string, string | undefined> | null
  } | null
  defaultOgImage?: string | null
  twitterSite?: string | null
  twitterCreator?: string | null
  keywords?: string | Record<string, string | undefined> | null
}

type GlobalMetadataResolved = {
  siteName: string | undefined
  siteDescription: string | undefined
  defaultOgImage: string | undefined
  twitterSite: string | undefined
  twitterCreator: string | undefined
  keywords: string | undefined
}

const titleOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

const imageUrlOf = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'url' in (value as Record<string, unknown>)) {
    const url = (value as { url?: unknown }).url
    return typeof url === 'string' ? url : undefined
  }
  return undefined
}

const resolveLocalized = (
  value: string | Record<string, string | undefined> | null | undefined,
  locale: string
): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object') {
    const localized = (value as Record<string, string | undefined>)[locale]
    if (typeof localized === 'string' && localized.length > 0) return localized
  }
  return undefined
}

const GLOBAL_SLUG = 'metadata'

const NoImageBox: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      alignItems: 'center',
      background: 'var(--theme-elevation-100)',
      color: 'var(--theme-elevation-600)',
      display: 'flex',
      height: '120px',
      justifyContent: 'center',
      fontSize: '13px'
    }}
  >
    {label}
  </div>
)

export const MetaPreview: React.FC<PreviewProps> = ({
  pathPrefix = 'meta',
  fieldPaths: providedFieldPaths
}) => {
  const { t } = useTranslation<PluginSEOTranslations, PluginSEOTranslationKeys>()

  const {
    config: { serverURL }
  } = useConfig()

  const locale = useLocale()

  const { getData } = useForm()

  const [fields] = useAllFormFields()

  const valueAt = (path: string) => {
    const entry = fields[path] as FormField | undefined
    return entry?.value
  }


  const titlePath = providedFieldPaths?.title ?? `${pathPrefix}.title`
  const descriptionPath = providedFieldPaths?.description ?? `${pathPrefix}.description`
  const imagePath = providedFieldPaths?.image ?? `${pathPrefix}.image`
  const ogTitlePath = providedFieldPaths?.ogTitle ?? `${pathPrefix}.ogTitle`
  const ogDescriptionPath = providedFieldPaths?.ogDescription ?? `${pathPrefix}.ogDescription`
  const ogImagePath = providedFieldPaths?.ogImage ?? `${pathPrefix}.ogImage`
  const ogTypePath = providedFieldPaths?.ogType ?? `${pathPrefix}.ogType`
  const twitterTitlePath = providedFieldPaths?.twitterTitle ?? `${pathPrefix}.twitterTitle`
  const twitterDescriptionPath = providedFieldPaths?.twitterDescription ?? `${pathPrefix}.twitterDescription`
  const twitterImagePath = providedFieldPaths?.twitterImage ?? `${pathPrefix}.twitterImage`
  const twitterCardPath = providedFieldPaths?.twitterCard ?? `${pathPrefix}.twitterCard`
  const robotsPath = providedFieldPaths?.robots ?? `${pathPrefix}.robots`


  const pageData = (() => {
    try {
      return (getData() as Record<string, unknown> | undefined) ?? undefined
    } catch {
      return undefined
    }
  })()

  const pickLocalizedString = (raw: unknown): string | undefined => {
    if (typeof raw === 'string' && raw.trim().length > 0) return raw
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      const code = localeCode
      if (code) {
        const v = obj[code]
        if (typeof v === 'string' && v.trim().length > 0) return v
      }
      for (const v of Object.values(obj)) {
        if (typeof v === 'string' && v.trim().length > 0) return v
      }
    }
    return undefined
  }

  const pageTitle = pickLocalizedString(pageData?.title)
  const pageDescription = pickLocalizedString(pageData?.description)
  const pageHeroImage = (() => {
    const raw = pageData?.heroImage ?? pageData?.image ?? pageData?.cover
    if (!raw) return undefined
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object' && raw && 'url' in (raw as Record<string, unknown>)) {
      const url = (raw as { url?: unknown }).url
      return typeof url === 'string' ? url : undefined
    }
    return undefined
  })()

  const title = titleOf(valueAt(titlePath)) ?? pageTitle
  const description = titleOf(valueAt(descriptionPath)) ?? pageDescription
  const image = imageUrlOf(valueAt(imagePath)) ?? pageHeroImage


  const ogTitle: string = titleOf(valueAt(ogTitlePath)) ?? title ?? ''
  const ogDescription: string = titleOf(valueAt(ogDescriptionPath)) ?? description ?? ''
  const ogImage: string = imageUrlOf(valueAt(ogImagePath)) ?? image ?? ''
  const ogType: string = titleOf(valueAt(ogTypePath)) ?? 'website'

  const twitterTitle: string = titleOf(valueAt(twitterTitlePath)) ?? ogTitle
  const twitterDescription: string = titleOf(valueAt(twitterDescriptionPath)) ?? ogDescription
  const twitterImage: string = imageUrlOf(valueAt(twitterImagePath)) ?? ogImage
  const twitterCard: string = titleOf(valueAt(twitterCardPath)) ?? 'summary_large_image'

  const robots = valueAt(robotsPath)


  const localeCode = typeof locale === 'object' ? locale?.code : locale

  const [globalMeta, setGlobalMeta] = useState<GlobalMetadataResolved>({
    siteName: undefined,
    siteDescription: undefined,
    defaultOgImage: undefined,
    twitterSite: undefined,
    twitterCreator: undefined,
    keywords: undefined
  })

  useEffect(() => {
    if (typeof serverURL !== 'string' || !localeCode) return
    let cancelled = false
    const url = `${serverURL}/api/globals/${GLOBAL_SLUG}?depth=0&draft=false&locale=${encodeURIComponent(localeCode)}`
    fetch(url, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GlobalMetadataRaw | null) => {
        if (cancelled || !data) return
        setGlobalMeta({
          siteName: resolveLocalized(data.shared?.name, localeCode),
          siteDescription: resolveLocalized(data.shared?.description, localeCode),
          defaultOgImage: typeof data.defaultOgImage === 'string' && data.defaultOgImage.length > 0
            ? data.defaultOgImage
            : undefined,
          twitterSite: typeof data.twitterSite === 'string' && data.twitterSite.length > 0
            ? data.twitterSite
            : undefined,
          twitterCreator: typeof data.twitterCreator === 'string' && data.twitterCreator.length > 0
            ? data.twitterCreator
            : undefined,
          keywords: resolveLocalized(data.keywords, localeCode)
        })
      })
      .catch(() => {
      })
    return () => {
      cancelled = true
    }
  }, [serverURL, localeCode])


  const finalImage = image ?? globalMeta.defaultOgImage
  const finalOgImage = ogImage || finalImage || globalMeta.defaultOgImage || ''
  const finalTwitterImage = twitterImage || finalOgImage || globalMeta.defaultOgImage || ''
  const siteNameForTitle = globalMeta.siteName


  const data = getData()
  const docSlug = (data && typeof data === 'object' && 'slug' in data
    ? (data as { slug?: unknown }).slug
    : undefined) as string | undefined

  const canonicalUrl = useMemo(() => {
    if (typeof serverURL === 'string' && docSlug) {
      try {
        return new URL(`/${docSlug}`, serverURL).toString()
      } catch {
        return undefined
      }
    }
    return undefined
  }, [docSlug, serverURL])

  const serpTitle = title ?? siteNameForTitle ?? ''
  const serpDescription = description ?? globalMeta.siteDescription ?? ''
  const serpLine = canonicalUrl
    ?? (siteNameForTitle ? `${serverURL} · ${siteNameForTitle}` : serverURL ?? 'https://…')

  const ogDomainLine = (() => {
    if (canonicalUrl) {
      try {
        return new URL(canonicalUrl).host
      } catch {
        return canonicalUrl
      }
    }
    if (typeof serverURL === 'string') {
      try {
        return new URL(serverURL).host
      } catch {
        return serverURL
      }
    }
    return ''
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>{t('plugin-seo:previewSerp')}</h4>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '6px',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '600px',
            padding: '16px'
          }}
        >
          <div style={{ color: '#006621', fontSize: '13px' }}>{serpLine}</div>
          <div style={{ color: '#1a0dab', fontSize: '18px', lineHeight: 1.3, marginTop: '4px' }}>
            {serpTitle || t('plugin-seo:previewTitlePlaceholder')}
          </div>
          <div style={{ color: '#545454', fontSize: '13px', lineHeight: 1.5, marginTop: '4px' }}>
            {serpDescription || t('plugin-seo:previewDescriptionPlaceholder')}
          </div>
        </div>
      </section>

      {}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>{t('plugin-seo:previewOg')}</h4>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '6px',
            maxWidth: '600px',
            overflow: 'hidden'
          }}
        >
          {finalOgImage ? (
            <div
              style={{
                background: `url(${JSON.stringify(finalOgImage)}) center/cover no-repeat`,
                height: '260px'
              }}
            />
          ) : (
            <NoImageBox label={t('plugin-seo:noImage')} />
          )}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ color: '#606060', fontSize: '12px', textTransform: 'uppercase' }}>
              {ogType} · {ogDomainLine}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
              {ogTitle || siteNameForTitle || t('plugin-seo:previewTitlePlaceholder')}
            </div>
            <div style={{ color: '#606060', fontSize: '14px' }}>
              {ogDescription || t('plugin-seo:previewDescriptionPlaceholder')}
            </div>
          </div>
        </div>
      </section>

      {}
      <section>
        <h4 style={{ margin: '0 0 8px' }}>{t('plugin-seo:previewTwitter')}</h4>
        <div
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '6px',
            maxWidth: '600px',
            overflow: 'hidden'
          }}
        >
          {finalTwitterImage ? (
            <div
              style={{
                background: `url(${JSON.stringify(finalTwitterImage)}) center/cover no-repeat`,
                height: twitterCard === 'summary_large_image' ? '260px' : '120px'
              }}
            />
          ) : (
            <NoImageBox label={t('plugin-seo:noImage')} />
          )}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>
              {twitterTitle || siteNameForTitle || t('plugin-seo:previewTitlePlaceholder')}
            </div>
            <div style={{ color: '#606060', fontSize: '14px' }}>
              {twitterDescription || t('plugin-seo:previewDescriptionPlaceholder')}
            </div>
            <div style={{ color: '#606060', fontSize: '12px', marginTop: '4px' }}>
              {canonicalUrl ?? 'https://…'}
              {localeCode ? ` · ${localeCode.toUpperCase()}` : ''}
              {globalMeta.twitterSite ? ` · ${globalMeta.twitterSite}` : ''}
            </div>
          </div>
        </div>
      </section>

      {typeof robots === 'string' && robots && (
        <section>
          <h4 style={{ margin: '0 0 8px' }}>{t('plugin-seo:robotsLabel')}</h4>
          <code
            style={{
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              display: 'inline-block',
              padding: '4px 8px'
            }}
          >
            {robots}
          </code>
        </section>
      )}
    </div>
  )
}