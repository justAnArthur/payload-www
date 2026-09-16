/** icu-style `{name}` placeholders, sorted, so a translation can be checked against its source */
export const placeholdersOf = (value: string): string[] =>
  (value.match(/\{\s*[\w.]+\s*(?:,[^{}]*)?\}/g) ?? []).map((each) => each.replace(/\s+/g, '')).sort()

export const samePlaceholders = (source: string, translated: string): boolean =>
  placeholdersOf(source).join('|') === placeholdersOf(translated).join('|')
