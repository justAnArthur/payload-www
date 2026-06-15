import type { ImportMap } from 'payload'
import React from 'react'

import { getFromImportMap } from './getFromImportMap'

export function renderCollectionModule(
  collection: { slug: string; custom?: Record<string, any> }[] = [],
  slug: string,
  importMap: ImportMap,
  props?: Record<string, any>,
) {
  const renderPath = collection?.find((c) => c.slug === slug)?.custom?.path
  if (!renderPath) return null

  const CollectionRenderModule = getFromImportMap(renderPath, importMap)
  if (!CollectionRenderModule) {
    if (process.env.NODE_ENV !== 'production') {
      throw Error(
        `Render module for collection with slug "${slug}" not found at path "${renderPath}". Check your import map and collection configuration.`,
      )
    }
    return null
  }

  return <CollectionRenderModule importMap={importMap} {...props} />
}
