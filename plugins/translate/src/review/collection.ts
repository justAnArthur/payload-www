import type { CollectionConfig } from 'payload'

import { TRANSLATION_STATUS_SLUG } from './constants'

const signedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/** one row per entity and target locale: what source it was translated from, and who reviewed it */
export const createTranslationStatusCollection = (): CollectionConfig => ({
  slug: TRANSLATION_STATUS_SLUG,
  admin: {
    hidden: true
  },
  access: {
    create: signedIn,
    delete: signedIn,
    read: signedIn,
    update: signedIn
  },
  fields: [
    { name: 'entity', type: 'text', required: true, index: true },
    { name: 'locale', type: 'text', required: true, index: true },
    { name: 'sourceHash', type: 'text' },
    { name: 'translatedAt', type: 'date' },
    { name: 'reviewedHash', type: 'text' },
    { name: 'reviewedAt', type: 'date' },
    { name: 'reviewedBy', type: 'text' }
  ]
})
