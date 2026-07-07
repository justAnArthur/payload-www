import type { AdminComponent, CollectionConfig, Config, GlobalConfig, Plugin } from 'payload'
import { name as packageName } from "../package.json"
import openAIResolver from "@justanarthur/payload-plugin-translator/resolvers/openAI"
import { createPostsCollection, POSTS_SLUG } from "./collections/createPostsCollection"
import { createPagesCollection, PAGES_SLUG } from "./collections/createPagesCollection"
import { createFooterGlobal, FOOTER_SLUG } from "./collections/createFooterGlobal"
import { createHeaderGlobal, HEADER_SLUG } from "./collections/createHeaderGlobal"
import { seoPlugin } from '@justanarthur/payload-plugin-seo'
import { imageHashPlugin } from '@justanarthur/payload-imagehash-plugin'
import { translator } from '@justanarthur/payload-plugin-translator'
import { mcpPlugin, MCPPluginConfig } from '@payloadcms/plugin-mcp'
import { SEOPluginConfig } from "@justanarthur/payload-plugin-seo/types"
import { BlurhashPluginOptions } from "@justanarthur/payload-imagehash-plugin/types"
import { TranslatorConfig } from "@justanarthur/payload-plugin-translator/types"

export type WWWConfigApi = {
  withWWWConfig: (config: WWWInputConfig) => Config
}

export type WWWInputConfig = Omit<Config, 'collections' | 'globals' | 'plugins'> & {
  collections: MergeOrOverride<CollectionConfig[]>
  globals: MergeOrOverride<GlobalConfig[]>
  plugins?: MergeOrOverride<Plugin[]>,
  defaultPluginsConfigs?: {
    seo?: MergeOrOverride<SEOPluginConfig>,
    imageHash?: MergeOrOverride<BlurhashPluginOptions>,
    translator?: MergeOrOverride<TranslatorConfig>,
    mcp?: MergeOrOverride<MCPPluginConfig>
  }
}

export function createWWWConfig(): WWWConfigApi {
  function withWWWConfig(input: WWWInputConfig) {
    const { defaultPluginsConfigs, ...config } = input
    const blocks = config.blocks || []

    const collections = mergeOrOverride([
      createPagesCollection(blocks),
      createPostsCollection()
    ], config.collections)

    const globals = mergeOrOverride([
      createHeaderGlobal(),
      createFooterGlobal()
    ], config.globals)

    const renderDependencies: Record<string, AdminComponent> = {}
    for (const { slug, custom } of blocks) {
      const path = custom?.[packageName]?.path
      if (typeof path === 'string' && slug) renderDependencies[slug] = { path, type: 'component' }
    }
    for (const { custom } of [...collections, ...globals]) {
      const path = custom?.[packageName]?.path
      if (typeof path === 'string') renderDependencies[path] = { path, type: 'component' }
    }

    const plugins = mergeOrOverride(
      [
        seoPlugin(mergeOrOverride({
          collections: [PAGES_SLUG, POSTS_SLUG],
          openaiApiKey: process.env.OPENAI_API_KEY,
          autoGenerate: {
            mode: 'onCreateOrUpdate',
            deriveFrom: 'allScalars'
          }
        }, defaultPluginsConfigs?.seo)),
        imageHashPlugin(mergeOrOverride({
          algorithm: 'lqip-modern'
        }, defaultPluginsConfigs?.imageHash)),
        translator(mergeOrOverride({
          collections: [PAGES_SLUG, POSTS_SLUG],
          globals: [HEADER_SLUG, FOOTER_SLUG],
          resolvers: [
            openAIResolver({
              apiKey: process.env.OPENAI_API_KEY!,
              chunkLength: 31,
              model: 'gpt-5.4-mini'
            })
          ]
        }, defaultPluginsConfigs?.translator)),
        mcpPlugin(mergeOrOverride<MCPPluginConfig>({
          collections: Object.fromEntries(
            collections.map(({ slug, admin }) => [slug, {
              enabled: { find: true, create: true, update: true, delete: true },
              description: typeof admin?.description === 'string' ? admin.description : undefined
            }])
          ),
          globals: Object.fromEntries(
            globals.map(({ slug, admin }) => [slug, {
              enabled: { find: true, update: true },
              description: typeof admin?.description === 'string' ? admin.description : undefined
            }])
          )
        }, defaultPluginsConfigs?.mcp))
      ],
      config.plugins)

    return ({
      ...config,
      collections,
      globals,
      plugins,
      admin: {
        ...(config.admin ?? {}),
        dependencies: {
          ...renderDependencies,
          ...(config.admin?.dependencies ?? {})
        }
      }
    }) as Config
  }

  return { withWWWConfig }
}

type MergeOrOverride<T> = T | ((defaultValue: T) => T)

function mergeOrOverride<T>(defaultValue: T, overrideValue?: T | ((d: T) => T)) {
  if (typeof overrideValue === 'function') return (overrideValue as (d: T) => T)(defaultValue)
  if (overrideValue !== undefined) return overrideValue
  return defaultValue
}
