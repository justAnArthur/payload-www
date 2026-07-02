import type { ImportMap } from 'payload'
import React from 'react'

import { getFromImportMap } from '../../core/utils/getFromImportMap'

export function renderCollectionModule(
  collection: { slug: string; custom?: Record<string, any> }[] = [],
  slug: string,
  importMap: ImportMap,
  props?: Record<string, any>
) {
  const renderPath = collection?.find((c) => c.slug === slug)?.custom?.path
  if (!renderPath) {
    console.log('[WWW] render/utils:renderCollectionModule no custom.path slug=', slug)
    return null
  }

  const CollectionRenderModule = getFromImportMap(renderPath, importMap)
  if (!CollectionRenderModule) {
    console.error('[WWW] render/utils:renderCollectionModule not found slug=', slug, 'path=', renderPath)
    if (process.env.NODE_ENV !== 'production') {
      throw Error(
        `Render module for collection with slug "${slug}" not found at path "${renderPath}". Check your import map and collection configuration.`
      )
    }
    return null
  }

  console.log('[WWW] render/utils:renderCollectionModule rendering slug=', slug, 'path=', renderPath)
  return <CollectionRenderModule importMap={importMap} {...props} />
}
