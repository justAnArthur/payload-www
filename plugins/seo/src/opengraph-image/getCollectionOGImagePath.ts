import type { SanitizedCollectionConfig } from 'payload'


export const getCollectionOGImagePath = (
  collection: SanitizedCollectionConfig | undefined
): string | undefined => {
  const custom = collection?.custom as Record<string, unknown> | undefined
  const path = custom?.ogImage
  return typeof path === 'string' && path.length > 0 ? path : undefined
}