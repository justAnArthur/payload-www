import type { RoutingConfig } from './buildLocalizedPath'

/** The locales one deployment serves, read at runtime. Missing or invalid parts fall back to `routing`. */
export type RuntimeLocales = {
  locales?: readonly string[] | null
  defaultLocale?: string | null
}

/**
 * Reads the locales one deployment serves, e.g. from a settings global in its database. It runs on
 * every render, so cache it: `localesFromGlobal` reads through the lib's tagged `queryGlobal`, and a
 * hand-written resolver should be a `'use cache'` function with a tag its source busts.
 */
export type ResolveLocales = (routing: RoutingConfig) => Promise<RuntimeLocales | null | undefined>

/**
 * Narrows the static `routing` (the superset Payload's `localization` knows) to the runtime subset.
 * Unknown locales are dropped, so a stale setting can't route a locale Payload has no content for.
 * Nothing valid left means the deployment was never configured, and it keeps the full `routing`.
 * The default falls back to the static default when enabled, else to the first enabled locale.
 */
export function narrowRouting(routing: RoutingConfig, runtime: RuntimeLocales | null | undefined): RoutingConfig {
  const known = new Set<string>(routing.locales)
  const locales = [...new Set(runtime?.locales ?? [])].filter(locale => known.has(locale))
  if (locales.length === 0) return routing

  const defaultLocale = [runtime?.defaultLocale, routing.defaultLocale]
    .find((locale): locale is string => !!locale && locales.includes(locale)) ?? locales[0]

  return { ...routing, locales, defaultLocale }
}

/** The routing a request is served with: `routing` itself without a resolver, else its runtime subset. */
export async function resolveRouting(routing: RoutingConfig, resolveLocales?: ResolveLocales): Promise<RoutingConfig> {
  if (!resolveLocales) return routing
  return narrowRouting(routing, await resolveLocales(routing))
}
