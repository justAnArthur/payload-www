/** returns the language a target text is written in when that is not the expected locale, else null */
export type WrongLanguageCheck = (text: string, expectedLocale: string) => string | null

// pairs the detector confuses most; they need a clearer lead before a text counts as foreign
const CLOSE_PAIRS = new Set(['cs|sk', 'sk|cs', 'es|pt', 'pt|es', 'es|it', 'it|es', 'nl|de', 'de|nl'])

const MIN_LENGTH = 40
const MIN_WORDS = 5
const MARGIN = 0.03
const CLOSE_MARGIN = 0.06
const SHORT_LENGTH = 80
const SHORT_EXTRA_MARGIN = 0.03

const base = (locale: string) => locale.split(/[-_]/)[0].toLowerCase()

// emails, urls, numbers and slashed or hyphenated loanwords (check-in/out, e-mail) say nothing about the language
const stripNonWords = (text: string) =>
  text
    .replace(/\S+@\S+|https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/\S*[/\d]\S*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** addresses, contact blocks and bullet-like copy: several short lines rather than prose */
const looksLikeList = (text: string) => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 3) return false
  const lengths = lines.map((line) => line.length).sort((a, b) => a - b)
  return lengths[Math.floor(lengths.length / 2)] < MIN_LENGTH
}

let detector: Promise<WrongLanguageCheck | null> | undefined

/**
 * lazily loads eld's small n-gram database, limited to the configured locales. thresholds were tuned
 * on real site copy: no false positives on ~4900 paragraphs, ~99% of misplaced ones caught.
 */
export const loadWrongLanguageCheck = (locales: string[]): Promise<WrongLanguageCheck | null> => {
  detector ??= import('eld/small')
    .then(({ eld }) => {
      const languages = [...new Set(locales.map(base))]
      eld.setLanguageSubset(languages)

      return (text: string, expectedLocale: string) => {
        const expected = base(expectedLocale)
        if (looksLikeList(text)) return null

        const normalized = stripNonWords(text)
        if (normalized.length < MIN_LENGTH || normalized.split(' ').length < MIN_WORDS) return null

        const result = eld.detect(normalized.slice(0, 1000))
        if (!result.language || result.language === expected || !result.isReliable()) return null

        const scores = result.getScores()
        const lead = (scores[result.language] ?? 0) - (scores[expected] ?? 0)

        // short copy mixes in loanwords more easily, so it needs a clearer lead
        const margin = (CLOSE_PAIRS.has(`${expected}|${result.language}`) ? CLOSE_MARGIN : MARGIN) +
          (normalized.length < SHORT_LENGTH ? SHORT_EXTRA_MARGIN : 0)

        return lead >= margin ? result.language : null
      }
    })
    .catch(() => null)

  return detector
}
