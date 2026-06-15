import type { CollectionBeforeChangeHook } from 'payload'

export const populatePublishedAt: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if ((operation === 'create' || operation === 'update') && req.data && !req.data.publishedAt) {
    return { ...data, publishedAt: new Date() }
  }
  return data
}
