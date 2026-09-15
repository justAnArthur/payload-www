import { name } from "../../package.json"
import { type CollectionConfig, Field, GlobalConfig } from "payload"
import { populatePublishedAt } from "./hooks/populatePublishedAt"
import { slugField } from "./fields/slug"
import { anyone, authenticated, authenticatedOrPublished } from "./access"

export type CreateWWWCollectionArgs<IsGlobalConfig extends boolean> = {
  slug: string,
  renderPath: string,
  isGlobalConfig?: IsGlobalConfig,
  isDraft?: boolean,
  useAsTitle?: string,
}

export function createWWWCollectionGlobal<IsGlobalConfig extends boolean = false, Config = IsGlobalConfig extends true ? GlobalConfig : CollectionConfig>(
  fields: Field[],
  {
    slug: collectionSlug,
    renderPath,
    isGlobalConfig = false as IsGlobalConfig,
    isDraft = true,
    useAsTitle
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

    admin: useAsTitle
      ? { useAsTitle, defaultColumns: useAsTitle === 'title' ? [useAsTitle, 'slug', 'publishedAt'] : undefined }
      : undefined,

    custom: { [name]: { path: renderPath } },

    access: {
      create: authenticated,
      delete: authenticated,
      read: isDraft ? authenticatedOrPublished : anyone,
      update: authenticated
    },

    hooks: {
      beforeChange: [populatePublishedAt]
    },

    ...(isDraft && {
      versions: { drafts: { autosave: { interval: 3000 } } }
    })
  }) as Config
}
