/**
 * @justanarthur/payload-www — root public surface.
 *
 * The lib is organised into four domain groups:
 *
 *   core/    domain-agnostic primitives (fields, hooks, access, utils)
 *   data/    data-layer modules (collections, seed, test)
 *   render/  App Router rendering modules (components, pages, blocks,
 *            hooks, metadata, utils) — **App Router only**
 *   config/  the composer (createWWWConfig)
 *
 * Hosts can import the headline factory via:
 *
 *   import { createWWWConfig } from '@justanarthur/payload-www'
 *   import { createWWWConfig } from '@justanarthur/payload-www/with-www-config'
 *
 * The root barrel is **safe to import from a Node entrypoint** such as
 * `payload.config.ts`. It only re-exports the composer + server-only
 * primitives (collections, fields, access, etc.). The render group
 * (React components, `next/headers`, `next/cache`, `next/navigation`)
 * is intentionally NOT re-exported here — hosts must import render
 * modules from a subpath (`@justanarthur/payload-www/render-pages`,
 * `@justanarthur/payload-www/render-components`, ...) and only from
 * inside App Router contexts (Server Components, server actions).
 *
 * For fine-grained access, subpath imports are also available:
 *
 *   @justanarthur/payload-www/core/fields
 *   @justanarthur/payload-www/data/collections
 *   @justanarthur/payload-www/render-pages
 *   ...
 *
 * The lib's npm exports map (`exports` in package.json) declares the
 * per-domain subpath entry points.
 */
import { createWWWConfig } from './config/createWWWConfig'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig } from './config'
export * from './core'
export * from './data'

export default createWWWConfig
