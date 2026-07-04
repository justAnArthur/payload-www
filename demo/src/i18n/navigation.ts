import { createNavigation } from 'next-intl/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { Locale } from "@/i18n/locales"


export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)


export function setLocale(locale: string) {
  if (!(routing.locales as readonly string[]).includes(locale))
    notFound()

  setRequestLocale(locale as Locale)
}

export { NextIntlClientProvider, getMessages, getTranslations }
