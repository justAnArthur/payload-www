import type { CollectionConfig, PayloadRequest } from 'payload'

import { authenticated } from '@justanarthur/payload-www/access'

// `Access` is polymorphic (`boolean | Where`); for non-read operations
// (admin/create/delete/update) the `auth: true` Users collection only
// accepts a boolean return, so a narrower signature is required.
const isAuthenticated = ({ req: { user } }: { req: PayloadRequest }) => Boolean(user)

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: isAuthenticated,
    create: isAuthenticated,
    delete: isAuthenticated,
    read: authenticated,
    update: isAuthenticated
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name'
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text'
    }
  ],
  timestamps: true
}
