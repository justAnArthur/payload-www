import type { TranslatableField } from '../translate/types'
import type { WrongLanguageCheck } from '../utils/languageDetector'
import { looksUntranslated } from '../utils/looksUntranslated'
import { samePlaceholders } from '../utils/placeholders'
import { plainText } from '../utils/plainText'

export type FieldState = 'identical' | 'missing' | 'ok' | 'placeholders' | 'wrongLanguage'

export type FieldStatus = TranslatableField & {
  state: FieldState
  sourceText: string
  targetText: string
  /** set for `wrongLanguage`: the language the target is actually written in */
  detectedLanguage?: string
}

export type LocaleSummary = {
  total: number
  ok: number
  missing: number
  identical: number
  placeholders: number
  wrongLanguage: number
  /** 0–100; a document with nothing to translate counts as fully covered */
  coverage: number
  slugMissing: boolean
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

const classify = (field: TranslatableField, sourceText: string, targetText: string): FieldState => {
  if (!normalize(targetText)) return 'missing'

  if (field.type === 'json' && !samePlaceholders(sourceText, targetText)) return 'placeholders'

  if (field.type !== 'slug' && looksUntranslated(sourceText, targetText)) return 'identical'

  return 'ok'
}

/** per-field state for one target locale; fields empty in the source are left out */
export const computeStatus = (
  fields: TranslatableField[],
  language?: { locale: string; check: WrongLanguageCheck | null }
): { fields: FieldStatus[]; summary: LocaleSummary } => {
  const statuses: FieldStatus[] = []

  for (const field of fields) {
    const sourceText = plainText(field.source)
    if (!normalize(sourceText)) continue

    const targetText = plainText(field.target)
    const state = classify(field, sourceText, targetText)
    const detectedLanguage = state === 'ok' && field.type !== 'slug' && language?.check
      ? language.check(targetText, language.locale) ?? undefined
      : undefined

    statuses.push({
      ...field,
      sourceText,
      targetText,
      state: detectedLanguage ? 'wrongLanguage' : state,
      ...(detectedLanguage ? { detectedLanguage } : {})
    })
  }

  const count = (state: FieldState) => statuses.filter((each) => each.state === state).length
  const ok = count('ok')

  return {
    fields: statuses,
    summary: {
      total: statuses.length,
      ok,
      missing: count('missing'),
      identical: count('identical'),
      placeholders: count('placeholders'),
      wrongLanguage: count('wrongLanguage'),
      coverage: statuses.length ? Math.floor((ok / statuses.length) * 100) : 100,
      slugMissing: statuses.some((each) => each.type === 'slug' && each.state === 'missing')
    }
  }
}
