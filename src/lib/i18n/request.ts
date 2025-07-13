import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'
import { getCachedGlobal } from '@/lib/utils/getGlobals'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const { messages } = await getCachedGlobal('messages', locale, 1)()

  return { locale, messages: (messages || {}) as Record<string, any> }
})
