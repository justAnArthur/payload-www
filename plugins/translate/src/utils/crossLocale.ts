import type { TranslatableField } from '../translate/types'
import { CLOSE_PAIRS } from './languageDetector'
import { plainText } from './plainText'

/**
 * Field texts of one document per target locale, keyed by field path — the input for
 * cross-locale duplicate detection.
 *
 * The statistical language check only fires on long prose (≥40 chars, ≥5 words), so the
 * locale race's damage — one locale's translation filed under another locale — hides in
 * exactly the short fields it skips. But the same field exists in every locale of the
 * document: a value that is byte-identical to another locale's value while differing from
 * the source is the race's fingerprint, no statistics required.
 */
export type CrossLocaleTexts = Map<string /* path */, Map<string /* locale */, string /* normalized text */>>

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * Values equal to the source are left out: a string shared by every locale is an
 * untranslatable (brand, address, label), not a duplicate, and this exclusion makes the
 * check safe on both the review and the retranslate side without extra guards.
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

/**
 * The first non-close-pair locale holding the exact same value, if any. Close pairs
 * (cs/sk, es/pt, …) legitimately converge on the same words, so a duplicate confined to
 * one proves nothing.
 */
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
