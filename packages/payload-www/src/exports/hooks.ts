import { populatePublishedAt } from '../core/hooks/populatePublishedAt'
import { createRevalidatePageHooks, type RevalidatePageOptions } from '../core/hooks/revalidatePage'
import { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../core/hooks/revalidateGlobal'
import {
  createTranslateToOtherLocalesHook,
  type TranslateToOtherLocalesOptions
} from '../core/hooks/translateToOtherLocales'

export default {
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook,
  populatePublishedAt
}

export {
  createRevalidateGlobalHook,
  createRevalidatePageHooks,
  createTranslateToOtherLocalesHook,
  populatePublishedAt,
  type RevalidateGlobalOptions,
  type RevalidatePageOptions,
  type TranslateToOtherLocalesOptions
}
