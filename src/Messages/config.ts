import type { GlobalConfig } from 'payload'
import { revalidateMessages } from '@/Messages/hooks/revalidateMessages'

export const Messages: GlobalConfig = {
  slug: 'messages',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'messages',
      type: 'json',
      label: false,
      required: true,
      localized: true,
    },
  ],
  hooks: {
    afterChange: [revalidateMessages],
  },
}
