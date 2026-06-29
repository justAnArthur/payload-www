import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

/**
 * next-intl's middleware. Handles locale detection (URL prefix →
 * cookie → `accept-language` fallback), redirects unprefixed URLs
 * to the user's preferred locale, and ensures every request to a
 * non-locale-prefixed path under `app/(frontend)/` is rerouted to
 * `/{defaultLocale}/…` (or the user's preferred locale).
 *
 * Excludes the Payload admin (`/admin`) and the Next.js internals
 * (`/_next/`, `/api/`) so the admin doesn't get a locale prefix
 * in its URLs.
 */
export default createMiddleware(routing)

export const config = {
  matcher: [
    // Root + every non-asset path. Excludes the Payload admin,
    // the API, the lib's preview route, and the Next.js internals.
    '/',
    '/((?!api|_next|_vercel|admin|next|.*\\..*).*)'
  ]
}
