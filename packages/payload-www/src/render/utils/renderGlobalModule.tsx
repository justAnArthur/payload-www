import type { ImportMap } from 'payload'
import React from 'react'

import { getFromImportMap } from '../../core/utils/getFromImportMap'

/**
 * Mirror of `renderCollectionModule` for Payload globals. Reads
 * `global.custom.path`, resolves it through the importMap, and renders
 * the resulting module with the supplied props.
 *
 * Globals don't have a `slug` field on docs (they're singletons), so
 * the only meaningful input beyond `importMap` is the resolved data
 * and the active locale.
 *
 * Returns `null` when:
 * - the global isn't registered in the host's Payload config
 *   (`globals.find(...)` returns undefined)
 * - `custom.path` is missing on the global
 * - the importMap doesn't have an entry for that path
 *
 * Throws in dev when `custom.path` is set but the importMap is
 * missing the entry — matches `renderCollectionModule`'s strictness
 * so the host gets a clear error in the console instead of a silent
 * layout break.
 */
export function renderGlobalModule(
  globals: { slug: string; custom?: Record<string, any> }[] = [],
  slug: string,
  importMap: ImportMap,
  props?: Record<string, any>
) {
  const renderPath = globals?.find((g) => g.slug === slug)?.custom?.path
  if (!renderPath) {
    console.log('[WWW] render/utils:renderGlobalModule no custom.path slug=', slug)
    return null
  }

  const GlobalRenderModule = getFromImportMap(renderPath, importMap)
  if (!GlobalRenderModule) {
    console.error('[WWW] render/utils:renderGlobalModule not found slug=', slug, 'path=', renderPath)
    if (process.env.NODE_ENV !== 'production') {
      throw Error(
        `Render module for global with slug "${slug}" not found at path "${renderPath}". Check your import map and global configuration.`
      )
    }
    return null
  }

  console.log('[WWW] render/utils:renderGlobalModule rendering slug=', slug, 'path=', renderPath)
  return <GlobalRenderModule importMap={importMap} {...props} />
}
