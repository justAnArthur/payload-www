import type { ImportMap } from 'payload'

export function getFromImportMap(key: string | undefined, importMap: ImportMap) {
  return key && importMap[key.includes('#') ? key : key + '#default']
}
