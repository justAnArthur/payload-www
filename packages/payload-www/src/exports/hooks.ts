import {
  createRevalidateCollectionHook,
  createRevalidatePageHooks,
  type CreateRevalidateCollectionHookOptions,
  type CreateRevalidatePageHooksOptions
} from '../render/hooks/revalidateCollection'
import { createRevalidateGlobalHook } from '../render/hooks/revalidateGlobal'

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
