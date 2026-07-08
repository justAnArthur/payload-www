import type { ComponentType } from 'react'
import type { ImportMap } from 'payload'

export type AsyncImportMapEntry<T = ComponentType> =
  | T
  | (() => Promise<{ default: T } | T>)

export type AsyncImportMap = Record<string, AsyncImportMapEntry>

export type ResolvedImportMapEntry<T = ComponentType> = T | Promise<T>

export function getFromImportMap<T = ComponentType>(
  key: string | undefined,
  importMap: ImportMap | AsyncImportMap
): ResolvedImportMapEntry<T> | undefined {
  if (!key) return undefined

  const entry = importMap[key.includes('#') ? key : `${key}#default`]
  if (entry == null) return undefined

  if (typeof entry === 'function') {
    return entry().then((mod: any) => {
      if (typeof mod === 'function') return mod as T
      const modObj = mod as { default?: T }
      return (modObj.default ?? (mod as unknown as T))
    })
  }

  return entry as T
}
