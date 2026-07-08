import { createWWWCollectionGlobal } from '@justanarthur/payload-www/collections'

export const MESSAGES_SLUG = 'messages'
export const MESSAGES_RENDER_PATH = '' // no render path — admin-managed global

export const createMessagesGlobal = () =>
  createWWWCollectionGlobal(
    [
      {
        name: 'messages',
        type: 'json',
        label: false,
        required: true,
        localized: true
      }
    ],
    {
      slug: MESSAGES_SLUG,
      renderPath: MESSAGES_RENDER_PATH,
      isGlobalConfig: true
    }
  )