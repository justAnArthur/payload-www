import { createWWWCollectionGlobal } from "../collections/createWWWCollectionGlobal"
import {
  createCollectionCacheKey,
  createRevalidateCollectionGlobalHook
} from "../collections/hooks/createRevalidateCollectionGlobalHook"
import { queryDoc } from "../render/metadata/query"
import { createSitemapFromCollections } from "../render/pages/createCollectionPageExports"

const collections = {
  createWWWCollectionGlobal,
  createRevalidateCollectionGlobalHook,
  createCollectionCacheKey,
  createSitemapFromCollections,
  queryDoc
}

export default collections
export {
  createWWWCollectionGlobal,
  createRevalidateCollectionGlobalHook,
  createCollectionCacheKey,
  createSitemapFromCollections,
  queryDoc
}
