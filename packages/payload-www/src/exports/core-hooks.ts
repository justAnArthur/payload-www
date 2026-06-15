import { populatePublishedAt } from '../core/hooks/populatePublishedAt'
import { createRevalidatePageHooks } from '../core/hooks/revalidatePage'
import { createRevalidateGlobalHook } from '../core/hooks/revalidateGlobal'
import { createTranslateToOtherLocalesHook } from '../core/hooks/translateToOtherLocales'
import type {
  RevalidateGlobalOptions,
  RevalidatePageOptions,
  TranslateToOtherLocalesOptions
} from '../core/hooks/index'

export default {
  populatePublishedAt,
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook
}

export {
  populatePublishedAt,
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook,
  type RevalidatePageOptions,
  type RevalidateGlobalOptions,
  type TranslateToOtherLocalesOptions
} from '../core/hooks/index'
