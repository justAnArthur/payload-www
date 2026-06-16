import { populatePublishedAt } from '../core/hooks/populatePublishedAt'
import { createRevalidatePageHooks, type RevalidatePageOptions } from '../render/hooks/revalidatePage'
import { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../render/hooks/revalidateGlobal'
import { createTranslateToOtherLocalesHook, type TranslateToOtherLocalesOptions } from '../core/hooks/translateToOtherLocales'

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
}
