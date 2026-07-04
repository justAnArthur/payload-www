import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from "@/i18n/locales"


export const routing = defineRouting({
  locales,
  defaultLocale,
  
  
  
  
  localePrefix: 'as-needed'
})




;(routing as unknown as { labels: Record<string, string> }).labels = {
  en: 'English',
  uk: 'Українська'
}
