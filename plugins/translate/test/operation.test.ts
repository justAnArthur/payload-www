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
