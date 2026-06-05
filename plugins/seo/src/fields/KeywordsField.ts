import type { TextField } from 'payload'

export type KeywordsFieldOptions = {
  readonly localized?: boolean
}

/**
 * The meta `keywords` field. Comma-separated, legacy but still useful for
 * some crawlers.
 */
export const KeywordsField = (options: KeywordsFieldOptions = {}): TextField => {
  return {
    name: 'keywords',
    type: 'text',
    label: 'Keywords',
    admin: {
      description: 'Comma-separated keywords (legacy meta tag, still useful for some crawlers).',
    },
    localized: options.localized,
  } as unknown as TextField
}
