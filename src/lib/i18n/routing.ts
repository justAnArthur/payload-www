import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from '@/lib/i18n/locales'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true
})
