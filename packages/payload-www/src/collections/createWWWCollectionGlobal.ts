import { name } from "../../package.json"
import { type CollectionConfig, Field, GlobalConfig } from "payload"
import { populatePublishedAt } from "./hooks/populatePublishedAt"
import { createRevalidateCollectionGlobalHook } from "./hooks/createRevalidateCollectionGlobalHook"
import { slugField } from "./fields/slug"
import { anyone, authenticated, authenticatedOrPublished } from "./access"

export type CreateWWWCollectionArgs<IsGlobalConfig extends boolean> = {
  slug: string,
  renderPath: string,
  isGlobalConfig?: IsGlobalConfig,
  isDraft?: boolean,
}

export function createWWWCollectionGlobal<IsGlobalConfig extends boolean, Config = IsGlobalConfig extends true ? GlobalConfig : CollectionConfig>(
  fields: Field[],
  {
    slug: collectionSlug,
    renderPath,
    isGlobalConfig = false as IsGlobalConfig,
    isDraft = true
  }: CreateWWWCollectionArgs<IsGlobalConfig>): Config {
  return ({
    slug: collectionSlug,
    fields: isGlobalConfig
      ? fields
      : [
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
      read: isDraft ? authenticatedOrPublished : anyone,
      update: authenticated
    },

    hooks: (() => {
      const { afterChange, afterDelete } = createRevalidateCollectionGlobalHook()

      return ({
        afterChange: [afterChange],
        beforeChange: [populatePublishedAt],
        afterDelete: [afterDelete] // @ts-expect-error
      }) as Config['hooks']
    })(),

    ...(isDraft && {
      versions: { drafts: { autosave: { interval: 3000 } } }
    })
  }) as Config
}

