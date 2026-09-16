import type { TranslatableField } from '../translate/types'
import { isOpaqueText } from '../utils/isOpaqueText'
import { samePlaceholders } from '../utils/placeholders'
import { plainText } from './plainText'

export type FieldState = 'identical' | 'missing' | 'ok' | 'placeholders'

export type FieldStatus = TranslatableField & {
  state: FieldState
  sourceText: string
  targetText: string
}

export type LocaleSummary = {
  total: number
  ok: number
  missing: number
  identical: number
  placeholders: number
  /** 0–100; a document with nothing to translate counts as fully covered */
  coverage: number
  slugMissing: boolean
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

const classify = (field: TranslatableField, sourceText: string, targetText: string): FieldState => {
  if (!normalize(targetText)) return 'missing'

  if (field.type === 'json' && !samePlaceholders(sourceText, targetText)) return 'placeholders'

  // short strings, brand names and opaque values are legitimately the same in every locale
  const same = normalize(sourceText) === normalize(targetText)
  if (same && field.type !== 'slug' && normalize(sourceText).length > 3 && !isOpaqueText(sourceText) && /\s/.test(normalize(sourceText)))
    return 'identical'

  return 'ok'
}

/** per-field state for one target locale; fields empty in the source are left out */
export const computeStatus = (fields: TranslatableField[]): { fields: FieldStatus[]; summary: LocaleSummary } => {
  const statuses: FieldStatus[] = []

  for (const field of fields) {
    const sourceText = plainText(field.source)
    if (!normalize(sourceText)) continue

    const targetText = plainText(field.target)
    statuses.push({ ...field, sourceText, targetText, state: classify(field, sourceText, targetText) })
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
      coverage: statuses.length ? Math.floor((ok / statuses.length) * 100) : 100,
      slugMissing: statuses.some((each) => each.type === 'slug' && each.state === 'missing')
    }
  }
}
