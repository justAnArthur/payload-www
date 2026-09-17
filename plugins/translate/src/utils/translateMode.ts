/**
 * `missing` fills empty fields, `untranslated` also replaces fields that still hold the
 * source copy, `all` re-translates everything.
 */
export type TranslateMode = 'all' | 'missing' | 'untranslated'

export const translateModeArgs = (mode: TranslateMode | undefined) => ({
  emptyOnly: mode !== 'all',
  retranslateIdentical: mode === 'untranslated'
})

export const isTranslateMode = (value: unknown): value is TranslateMode =>
  value === 'all' || value === 'missing' || value === 'untranslated'
