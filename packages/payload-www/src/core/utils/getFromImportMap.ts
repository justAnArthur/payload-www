import type { ImportMap } from 'payload'

export function getFromImportMap(key: string, importMap: ImportMap) {
  const resolvedKey = key.includes('#') ? key : key + '#default'
  const value = importMap[resolvedKey]
  console.log('[WWW] core/utils:getFromImportMap key=', key, 'resolved=', resolvedKey, 'hit=', Boolean(value))
  return value
}
