import { describe, expect, it } from 'bun:test'

import { translateOperation } from '../src/translate/operation'
import type { TranslateResolver } from '../src/resolvers/types'

const logger = { info: () => {}, warn: () => {}, error: () => {} }

const reqWith = (resolver: TranslateResolver, docs: Record<string, any>) => ({
  payload: {
    logger,
    config: {
      collections: [{ slug: 'pages', fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'text', localized: true },
        { name: 'body', type: 'text', localized: true }
      ] }],
      globals: [],
      custom: { translator: { resolvers: [resolver] } }
    },
    findByID: async ({ locale }: { locale: string }) => docs[locale]
  }
}) as any

describe('translateOperation', () => {
  const docs = { en: { id: 1, title: 'One', subtitle: 'Two', body: 'Three' }, sk: { id: 1 } }

  it('applies nothing when the resolver merges values', async () => {
    const merging: TranslateResolver = { key: 'm', resolve: ({ texts }) => ({ success: true, translatedTexts: [texts.slice(0, 2).join(' '), texts[2]] }) }

    const result = await translateOperation({ req: reqWith(merging, docs), collectionSlug: 'pages', id: 1, locale: 'sk', localeFrom: 'en', resolver: 'm' })

    expect(result.success).toBe(false)
  })

  it('maps values back in order when counts match', async () => {
    const upper: TranslateResolver = { key: 'u', resolve: ({ texts }) => ({ success: true, translatedTexts: texts.map((t) => t.toUpperCase()) }) }

    const result = await translateOperation({ req: reqWith(upper, docs), collectionSlug: 'pages', id: 1, locale: 'sk', localeFrom: 'en', resolver: 'u' })

    expect(result.success && result.translatedData).toMatchObject({ title: 'ONE', subtitle: 'TWO', body: 'THREE' })
  })

  it('keeps the source when a translation drops a placeholder', async () => {
    const lossy: TranslateResolver = { key: 'l', resolve: ({ texts }) => ({ success: true, translatedTexts: texts.map(() => 'Ahoj') }) }
    const withPlaceholder = { en: { id: 1, title: 'Hi {name}' }, sk: { id: 1 } }

    const result = await translateOperation({ req: reqWith(lossy, withPlaceholder), collectionSlug: 'pages', id: 1, locale: 'sk', localeFrom: 'en', resolver: 'l' })

    expect(result.success && result.translatedData.title).toBe('Hi {name}')
  })
})

describe('translateOperation source-of-truth guard', () => {
  it('refuses to translate into the default locale', async () => {
    const copy: TranslateResolver = { key: 'c', resolve: ({ texts }) => ({ success: true, translatedTexts: texts }) }
    const req = {
      payload: {
        logger,
        config: {
          collections: [{ slug: 'pages', fields: [{ name: 'title', type: 'text', localized: true }] }],
          globals: [],
          localization: { defaultLocale: 'en', locales: ['en', 'sk'] },
          custom: { translator: { resolvers: [copy] } }
        },
        findByID: async () => ({ id: 1, title: 'One' })
      }
    } as any

    const attempt = translateOperation({ req, collectionSlug: 'pages', id: 1, locale: 'en', localeFrom: 'sk', resolver: 'c' })

    // the existing harness config has no localization block, so build one inline above;
    // the operation must reject before any translation work happens
    await expect(attempt).rejects.toThrow('Refusing to translate into the default locale')
  })
})

describe('translateOperation field sync', () => {
  it('persists a relationship change even when nothing needs translating', async () => {
    const copy: TranslateResolver = { key: 'c', resolve: ({ texts }) => ({ success: true, translatedTexts: texts }) }
    const docs = {
      en: { id: 1, updatedAt: 't0', title: 'Hello', reference: { relationTo: 'pages', value: 2 } },
      sk: { id: 1, updatedAt: 't0', title: 'Ahoj', reference: { relationTo: 'pages', value: 8 } }
    }
    const updates: any[] = []
    const req = {
      payload: {
        logger,
        config: {
          collections: [{ slug: 'pages', fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'reference', type: 'relationship', localized: true, relationTo: ['pages'] }
          ] }],
          globals: [],
          custom: { translator: { resolvers: [copy] } }
        },
        findByID: async ({ locale }: { locale: string }) => docs[locale],
        update: async (args: any) => updates.push(args)
      }
    } as any

    const result = await translateOperation({ req, collectionSlug: 'pages', id: 1, locale: 'sk', localeFrom: 'en', resolver: 'c', update: true, emptyOnly: true })

    expect(result.success && result.translatedCount).toBe(0)
    expect(result.success && result.syncedCount).toBe(1)
    expect(updates).toHaveLength(1)
    expect(updates[0].data.title).toBe('Ahoj')
    expect(updates[0].data.reference).toEqual({ relationTo: 'pages', value: 2 })
  })
})

describe('translateOperation cross-locale duplicates', () => {
  it('retranslates a short field duplicating another locale, which the statistical check cannot see', async () => {
    const upper: TranslateResolver = { key: 'u', resolve: ({ texts }) => ({ success: true, translatedTexts: texts.map((t) => t.toUpperCase()) }) }
    const docs = {
      en: { id: 1, updatedAt: 't0', title: 'About us' },
      sk: { id: 1, updatedAt: 't0', title: 'Sobre nós' },
      pt: { id: 1, updatedAt: 't0', title: 'Sobre nós' }
    }
    const req = {
      payload: {
        logger,
        config: {
          collections: [{ slug: 'pages', fields: [{ name: 'title', type: 'text', localized: true }] }],
          globals: [],
          localization: { defaultLocale: 'en', locales: ['en', 'sk', 'pt'] },
          custom: { translator: { resolvers: [upper] } }
        },
        findByID: async ({ locale }: { locale: string }) => docs[locale]
      }
    } as any

    const result = await translateOperation({
      req, collectionSlug: 'pages', id: 1, locale: 'sk', localeFrom: 'en',
      resolver: 'u', emptyOnly: true, retranslateIdentical: true
    })

    expect(result.success && result.translatedCount).toBe(1)
    expect(result.success && result.translatedData.title).toBe('ABOUT US')
  })
})
