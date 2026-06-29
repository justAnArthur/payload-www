import { createNavigation } from 'next-intl/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { Locale } from "@/i18n/locales"

/**
 * Wire next-intl into the App Router. `createMiddleware` runs in
 * the project's `middleware.ts` (see `/middleware.ts` at the
 * workspace root) and handles locale detection / redirects. The
 * App Router's `[locale]` segment is validated here in the layout
 * and any non-matching locale triggers a 404.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)

/**
 * Per-request server helpers. `setRequestLocale` makes the resolved
 * locale available to next-intl's async server APIs (translations,
 * date-fns locale, etc.). `getMessages` loads UI translation
 * bundles (empty for now). `getTranslations` returns a translator
 * for the resolved locale.
 */
export function setLocale(locale: string) {
  if (!(routing.locales as readonly string[]).includes(locale))
    notFound()

  setRequestLocale(locale as Locale)
}

export { NextIntlClientProvider, getMessages, getTranslations }
