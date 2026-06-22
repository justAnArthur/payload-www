import type { SanitizedCollectionConfig } from 'payload'

/**
 * Read `custom.ogImage` off a sanitized Payload collection.
 *
 * Returns `undefined` when the field isn't set — the route factory uses
 * that signal to fall through to Next.js's default `<meta>` tag rendering
 * (i.e. the URL field in `meta.social.ogImage` / `meta.content.image`).
 *
 * The `'@module/path#exportName'` string convention is identical to
 * payload-www's existing `collection.custom.path` (see
 * `packages/payload-www/src/render/utils/renderCollectionModule.tsx`).
 * The factory resolves it through Payload's import map via
 * `getFromImportMap` so the host can swap the OG image component per
 * collection without touching the route file.
 */
export const getCollectionOGImagePath = (
  collection: SanitizedCollectionConfig | undefined
): string | undefined => {
  const custom = collection?.custom as Record<string, unknown> | undefined
  const path = custom?.ogImage
  return typeof path === 'string' && path.length > 0 ? path : undefined
}