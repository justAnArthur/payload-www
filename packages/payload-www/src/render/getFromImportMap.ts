import type { ImportMap } from 'payload'

export function getFromImportMap(key: string, importMap: ImportMap) {
  return importMap[key.includes('#') ? key : key + '#default']
}
