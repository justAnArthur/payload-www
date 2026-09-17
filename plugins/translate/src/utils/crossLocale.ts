import type { TranslatableField } from '../translate/types'
import { CLOSE_PAIRS } from './languageDetector'
import { plainText } from './plainText'

/**
 * Field texts of one document per target locale, keyed by field path.
 *
 * The statistical language check needs long prose, so the locale race's damage — one
 * locale's translation filed under another — hides in exactly the short fields it skips.
 * A value byte-identical to another locale's value while differing from the source is
 * that race's fingerprint; no statistics required.
 */
export type CrossLocaleTexts = Map<string /* path */, Map<string /* locale */, string /* normalized text */>>

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * values equal to the source are left out: shared by every locale, they are untranslatables
 * (brands, addresses, labels), not duplicates — which keeps the check safe on the review and
 * retranslate side alike without extra guards
 */
export const buildCrossLocaleTexts = (
  fieldsPerLocale: { locale: string; fields: TranslatableField[] }[]
): CrossLocaleTexts => {
  const texts: CrossLocaleTexts = new Map()

  for (const { locale, fields } of fieldsPerLocale) {
    for (const field of fields) {
      const value = normalize(plainText(field.target))
      if (!value || value === normalize(plainText(field.source))) continue

      const byLocale = texts.get(field.path) ?? new Map()
      byLocale.set(locale, value)
      texts.set(field.path, byLocale)
    }
  }

  return texts
}

/** close pairs legitimately converge on the same words, so a duplicate within one proves nothing */
export const crossLocaleMatch = (
  texts: CrossLocaleTexts,
  path: string,
  locale: string,
  text: string
): string | undefined => {
  const value = normalize(text)
  if (!value) return undefined

  for (const [other, otherValue] of texts.get(path) ?? []) {
    if (other === locale || otherValue !== value || CLOSE_PAIRS.has(`${locale}|${other}`)) continue
    return other
  }

  return undefined
}
