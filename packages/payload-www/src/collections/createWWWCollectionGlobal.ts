import { name } from "../../package.json"
import { type CollectionConfig, Field, GlobalConfig } from "payload"
import { populatePublishedAt } from "./hooks/populatePublishedAt"
import { createRevalidateCollectionGlobalHook } from "./hooks/createRevalidateCollectionGlobalHook"
import { slugField } from "./fields/slug"
import { authenticated, authenticatedOrPublished } from "./access"

export type CreateWWWCollectionArgs = {
  slug: string
  renderPath: string
}

export function createWWWCollectionGlobal<Config extends CollectionConfig | GlobalConfig = CollectionConfig>(
  fields: Field[],
  {
    slug: collectionSlug,
    renderPath
  }: CreateWWWCollectionArgs): Config {
  return ({
    slug: collectionSlug,
    fields: [
      slugField(),
      {
        name: 'publishedAt',
        type: 'date',
        admin: { position: 'sidebar' }
      },
      ...fields
    ],

    custom: { [name]: { path: renderPath } },

    access: {
      create: authenticated,
      delete: authenticated,
      read: authenticatedOrPublished,
      update: authenticated
    },
    hooks: (() => {
      const { afterChange, afterDelete } = createRevalidateCollectionGlobalHook()

      return ({
        afterChange: [afterChange],
        beforeChange: [populatePublishedAt],
        afterDelete: [afterDelete]
      }) as Config['hooks']
    })(),
    versions: { drafts: { autosave: { interval: 3000 } } }
  }) as Config
}

