import type { CollectionBeforeChangeHook, CollectionConfig, Config } from 'payload'
import { Minimatch } from 'minimatch'
import { AlgorithmOptions, defaultAlgorithm, runAlgorithm } from './algorithms'

export type BlurhashPluginOptions = {
  
  collections?: CollectionConfig['slug'][];

  
  mimeTypePattern?: string;

  
  showBlurhashField?: boolean;
} & AlgorithmOptions;

const computeBlurhash = (
  pluginOptions?: BlurhashPluginOptions
): ((incomingConfig: Config) => Config) => {
  const {
    collections,
    mimeTypePattern = 'image/*',
    algorithm = defaultAlgorithm,
    showBlurhashField = false,
    ...options
  } = pluginOptions ?? ({} as BlurhashPluginOptions)

  const mimeTypeMatcher = new Minimatch(mimeTypePattern)

  return (incomingConfig: Config): Config => {
    const hook: CollectionBeforeChangeHook = async ({ data, req }) => {
      if (!mimeTypeMatcher.match(data.mimeType)) {
        return data
      }

      const file = req.file
      if (file == null || !('data' in file)) {
        return data
      }

      const fileData = file.data
      if (!Buffer.isBuffer(fileData)) {
        return data
      }

      const { hash, dataUrl } = await runAlgorithm(algorithm, fileData, options)

      return {
        ...data,
        [`${algorithm}Hash`]: hash,
        [`${algorithm}DataUrl`]: dataUrl
      }
    }

    return {
      ...incomingConfig,
      collections:
        incomingConfig.collections?.map((collection) => {
          if (!collection.upload) {
            return collection
          }

          if (collections && !collections.includes(collection.slug)) {
            return collection
          }

          return {
            ...collection,
            fields: [
              ...collection.fields,
              {
                name: `${algorithm}Hash`,
                type: 'text',
                admin: {
                  hidden: !showBlurhashField
                }
              },
              {
                name: `${algorithm}DataUrl`,
                type: 'text',
                admin: {
                  hidden: !showBlurhashField
                }
              }
            ],
            hooks: {
              ...collection.hooks,
              beforeChange: [...(collection.hooks?.beforeChange ?? []), hook]
            }
          }
        }) ?? []
    }
  }
}

export type ImageHashPlugin = (pluginOptions?: BlurhashPluginOptions) => (config: Config) => Config;

export const imageHashPlugin: ImageHashPlugin = computeBlurhash
export default imageHashPlugin
