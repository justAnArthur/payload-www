import { revalidatePlugin, type CollectionRevalidateConfig, type RevalidatePluginOptions } from '@pro-laico/payload-revalidate'
import { type CollectionConfig, flattenTopLevelFields, type Plugin } from 'payload'

// queryDocs tags this scope by default, so any real edit to a collection refreshes every listing of it
export const CONTENT_LIST = 'content'

export function revalidateWithContentLists(options: RevalidatePluginOptions): Plugin {
  // runs as a plugin so collections other plugins added are covered too
  return (config) => revalidatePlugin({
    ...options,
    collections: { ...options.collections, ...contentLists(config.collections ?? [], options.collections ?? {}) }
  })(config)
}

function contentLists(collections: CollectionConfig[], overrides: Partial<Record<string, CollectionRevalidateConfig | false>>) {
  return Object.fromEntries(collections.flatMap(({ slug, fields, custom }) => {
    const marker = custom?.revalidate
    const override = overrides[slug]
    if (override === false || (marker === false && override === undefined)) return []

    const lists = { [CONTENT_LIST]: flattenTopLevelFields(fields).map(({ name }) => name), ...marker?.lists, ...override?.lists }
    return [[slug, { ...override, lists }]]
  }))
}
