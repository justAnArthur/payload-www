import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

/**
 * next-intl's per-request server config. The demo doesn't have any
 * UI translation strings yet (the lib's components don't depend on
 * next-intl messages) — this stub is the entry point for adding
 * them later. Hosts that need localized UI strings import their
 * JSON message bundles here.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = (routing.locales as readonly string[]).includes(requested ?? '')
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale

  return {
    locale,
    messages: {}
  }
})
