import { populatePublishedAt } from '../hooks/populatePublishedAt'
import { createRevalidatePageHooks, type RevalidatePageOptions } from '../hooks/revalidatePage'
import { createRevalidateGlobalHook, type RevalidateGlobalOptions } from '../hooks/revalidateGlobal'
import {
  createTranslateToOtherLocalesHook,
  type TranslateToOtherLocalesOptions,
} from '../hooks/translateToOtherLocales'

export default {
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook,
  populatePublishedAt,
}

export {
  createRevalidatePageHooks,
  createRevalidateGlobalHook,
  createTranslateToOtherLocalesHook,
  populatePublishedAt,
  type RevalidatePageOptions,
  type RevalidateGlobalOptions,
  type TranslateToOtherLocalesOptions,
}
