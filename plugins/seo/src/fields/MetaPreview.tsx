'use client'

import { useAllFormFields, useConfig, useForm, useLocale, useTranslation } from '@payloadcms/ui'
import type { FormField, UIField } from 'payload'
import React, { useMemo } from 'react'

import type { PluginSEOTranslationKeys, PluginSEOTranslations } from '../translations'

type PreviewProps = {
  
  readonly pathPrefix?: string
} & UIField

type SocialValues = {
  ogDescription?: unknown
  ogImage?: unknown
  ogTitle?: unknown
  ogType?: unknown
  ogUrl?: unknown
  twitterCard?: unknown
  twitterDescription?: unknown
  twitterImage?: unknown
  twitterTitle?: unknown
}

type AdvancedValues = {
  canonicalUrl?: unknown
  robots?: unknown
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

const textOf = (value: unknown): string => titleOf(value) ?? ''


export const MetaPreview: React.FC<PreviewProps> = ({ pathPrefix = 'meta' }) => {
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

  
  const title = titleOf(valueAt(`${pathPrefix}.title`))
  const description = titleOf(valueAt(`${pathPrefix}.description`))
  const image = imageUrlOf(valueAt(`${pathPrefix}.image`))

  
  const socialPath = `${pathPrefix}.social`
  const social: SocialValues = {
    ogDescription: valueAt(`${socialPath}.ogDescription`),
    ogImage: valueAt(`${socialPath}.ogImage`),
    ogTitle: valueAt(`${socialPath}.ogTitle`),
    ogType: valueAt(`${socialPath}.ogType`),
    ogUrl: valueAt(`${socialPath}.ogUrl`),
    twitterCard: valueAt(`${socialPath}.twitterCard`),
    twitterDescription: valueAt(`${socialPath}.twitterDescription`),
    twitterImage: valueAt(`${socialPath}.twitterImage`),
    twitterTitle: valueAt(`${socialPath}.twitterTitle`)
  }
  const ogTitle: string = titleOf(social.ogTitle) ?? title ?? ''
  const ogDescription: string = titleOf(social.ogDescription) ?? description ?? ''
  const ogImage: string = imageUrlOf(social.ogImage) ?? image ?? ''
  const ogType: string = titleOf(social.ogType) ?? 'website'

  const twitterTitle: string = titleOf(social.twitterTitle) ?? ogTitle
  const twitterDescription: string = titleOf(social.twitterDescription) ?? ogDescription
  const twitterImage: string = imageUrlOf(social.twitterImage) ?? ogImage
  const twitterCard: string = titleOf(social.twitterCard) ?? 'summary'

  
  const advanced: AdvancedValues = {
    canonicalUrl: valueAt(`${pathPrefix}.advanced.canonicalUrl`),
    robots: valueAt(`${pathPrefix}.advanced.robots`)
  }

  
  const data = getData()
  const docSlug = (data && typeof data === 'object' && 'slug' in data
    ? (data as { slug?: unknown }).slug
    : undefined) as string | undefined

  const canonicalUrl = useMemo(() => {
    const explicit = titleOf(advanced.canonicalUrl)
    if (explicit) return explicit
    if (typeof serverURL === 'string' && docSlug) {
      try {
        return new URL(`/${docSlug}`, serverURL).toString()
      } catch {
        return explicit
      }
    }
    return explicit
  }, [advanced.canonicalUrl, docSlug, serverURL])

  const localeCode = typeof locale === 'object' ? locale?.code : locale

  
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
          <div style={{ color: '#006621', fontSize: '13px' }}>{canonicalUrl ?? 'https://…'}</div>
          <div style={{ color: '#1a0dab', fontSize: '18px', lineHeight: 1.3, marginTop: '4px' }}>
            {title ?? t('plugin-seo:previewTitlePlaceholder')}
          </div>
          <div style={{ color: '#545454', fontSize: '13px', lineHeight: 1.5, marginTop: '4px' }}>
            {description ?? t('plugin-seo:previewDescriptionPlaceholder')}
          </div>
        </div>
      </section>

      {}
      <p>OG Preview</p>

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
          {twitterImage ? (
            <div
              style={{
                background: `url(${JSON.stringify(twitterImage)}) center/cover no-repeat`,
                height: twitterCard === 'summary_large_image' ? '260px' : '120px'
              }}
            />
          ) : null}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>
              {twitterTitle ?? t('plugin-seo:previewTitlePlaceholder')}
            </div>
            <div style={{ color: '#606770', fontSize: '14px' }}>
              {twitterDescription ?? t('plugin-seo:previewDescriptionPlaceholder')}
            </div>
            <div style={{ color: '#606770', fontSize: '12px', marginTop: '4px' }}>
              {canonicalUrl ?? 'https://…'}
              {localeCode ? ` · ${localeCode.toUpperCase()}` : ''}
            </div>
          </div>
        </div>
      </section>

      {typeof advanced.robots === 'string' && advanced.robots && (
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
            {advanced.robots}
          </code>
        </section>
      )}
    </div>
  )
}
