import type { CollectionConfig } from 'payload'

import { anyone } from '@/lib/(payload)/access/anyone'
import { authenticated } from '@/lib/(payload)/access/authenticated'
import { slugField } from '@/lib/(payload)/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    ...slugField(),
  ],
}
