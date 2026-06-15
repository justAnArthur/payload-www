/**
 * @justanarthur/payload-www — root public surface.
 *
 * The lib is organised into four domain groups:
 *
 *   core/    domain-agnostic primitives (fields, hooks, access,
 *            utils, blocks)
 *   data/    data-layer modules (collections, seed, test)
 *   render/  rendering modules (components, pages, metadata)
 *   config/  the composer (createWWWConfig)
 *
 * Hosts can import the headline factory via:
 *
 *   import { createWWWConfig } from '@justanarthur/payload-www'
 *   import { createWWWConfig } from '@justanarthur/payload-www/with-www-config'
 *
 * For fine-grained access, subpath imports are also available:
 *
 *   @justanarthur/payload-www/core/fields
 *   @justanarthur/payload-www/data/collections
 *   @justanarthur/payload-www/render/pages
 *   ...
 *
 * The lib's npm exports map (`exports` in package.json) declares the
 * per-domain subpath entry points. Per-symbol re-exports below make
 * the root import ergonomic.
 */
import { createWWWConfig } from './config/createWWWConfig'

export { createWWWConfig, type WWWConfigOptions, type WWWConfigApi, type WWWInputConfig } from './config'
export * from './core'
export * from './data'
export * from './render'

export default createWWWConfig
