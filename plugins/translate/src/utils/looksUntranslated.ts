import { isOpaqueText } from './isOpaqueText'
import { plainText } from './plainText'

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * a target that still carries the source copy. single words, brand names and
 * opaque values are legitimately the same in every locale, so they don't count.
 */
export const looksUntranslated = (source: unknown, target: unknown): boolean => {
  const sourceText = normalize(plainText(source))

  return (
    sourceText.length > 3 &&
    /\s/.test(sourceText) &&
    !isOpaqueText(sourceText) &&
    sourceText === normalize(plainText(target))
  )
}
