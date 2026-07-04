import {
  createRevalidateCollectionHook,
  type CreateRevalidateCollectionHookOptions,
  createRevalidatePageHooks,
  type CreateRevalidatePageHooksOptions
} from '../collections/hooks/revalidateCollection'
import { createRevalidateGlobalHook } from '../collections/hooks/revalidateGlobal'

export default {
  createRevalidateCollectionHook,
  createRevalidatePageHooks,
  createRevalidateGlobalHook
}

export {
  createRevalidateCollectionHook,
  createRevalidateGlobalHook,
  createRevalidatePageHooks,
  type CreateRevalidateCollectionHookOptions,
  type CreateRevalidatePageHooksOptions
}
