import { queryGlobal } from './query'
import type { ResolveLocales } from '../pages/utils/resolveRouting'

export type LocalesFromGlobalArgs = {
  globalSlug: string
  /** Field holding the enabled locale codes. Defaults to `enabledLocales`. */
  localesField?: string
  /** Field holding the default locale code. Defaults to `defaultLocale`. */
  defaultLocaleField?: string
}

/**
 * A `ResolveLocales` reading a settings global. The read goes through `queryGlobal`, so it is
 * cached and tagged like every other global, and `revalidatePlugin()` refreshes it on save.
 * Both fields are expected to be unlocalized; the global is read in the static default locale.
 */
export function localesFromGlobal({
  globalSlug,
  localesField = 'enabledLocales',
  defaultLocaleField = 'defaultLocale'
}: LocalesFromGlobalArgs): ResolveLocales {
  return async (routing) => {
    const doc = await queryGlobal({ globalSlug, locale: routing.defaultLocale, depth: 0 }) as Record<string, unknown> | null
    const locales = doc?.[localesField]
    const defaultLocale = doc?.[defaultLocaleField]

    return {
      locales: Array.isArray(locales) ? locales.filter((l): l is string => typeof l === 'string') : null,
      defaultLocale: typeof defaultLocale === 'string' ? defaultLocale : null
    }
  }
}
