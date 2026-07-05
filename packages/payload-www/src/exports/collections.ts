import { createWWWCollectionGlobal } from "../collections/createWWWCollectionGlobal"
import {
  createCollectionCacheKey,
  createRevalidateCollectionGlobalHook
} from "../collections/hooks/createRevalidateCollectionGlobalHook"
import { queryDoc } from "../render/metadata/query"

const collections = {
  createWWWCollectionGlobal,
  createRevalidateCollectionGlobalHook,
  createCollectionCacheKey,
  queryDoc
}

export default collections
export { createWWWCollectionGlobal, createRevalidateCollectionGlobalHook, createCollectionCacheKey, queryDoc }
