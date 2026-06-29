import { defineRouting } from 'next-intl/routing'
import { defaultLocale, locales } from "@/i18n/locales"

/**
 * Single source of truth for the demo's locales and URL shape.
 * Mirrors the `locales` array passed to `createWWWConfig` in
 * `payload.config.ts` and the `localization` block in the same
 * config — the lib uses the same locales via the payload config, and
 * the lib's `createCollectionPageExports` reads THIS config for
 * URL building + hreflang alternates + the language switcher.
 *
 * The lib's `PageRouting` extends next-intl's `defineRouting` shape
 * with a `labels` field — per-locale human-readable labels for the
 * `<LocaleSwitcher>`. We carry it as an extra runtime field on the
 * object; the cast widens the type so `labels` is reachable.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // `as-needed` means the default locale renders at `/` (no
  // prefix); other locales render at `/uk`. This matches the
  // demo's existing URL shape (we don't need `/en/about` — just
  // `/about` for English, `/uk/about` for Ukrainian).
  localePrefix: 'as-needed'
})

// The lib's `<LocaleSwitcher>` reads `labels` off the routing
// object. Cast through `unknown` to add the field without
// fighting next-intl's complex `RoutingConfig` generics.
;(routing as unknown as { labels: Record<string, string> }).labels = {
  en: 'English',
  uk: 'Українська'
}
