import type { ComponentType } from 'react'
import type { ImportMap, SanitizedConfig } from 'payload'
import { name } from '../../package.json'
import { getFromImportMap, type AsyncImportMap } from './getFromImportMap'

export async function renderWWWDataModule(
  data: any,
  {
    collectionSlug,
    configPath = 'collections',
    config: configPromise,
    importMap
  }: {
    collectionSlug: string,
    configPath?: 'collections' | 'globals',
    config: Promise<SanitizedConfig>,
    importMap: ImportMap | AsyncImportMap
  },
  props?: Record<string, any>
) {
  const config = await configPromise

  const renderPath = config[configPath]?.find((c) => c.slug === collectionSlug)?.custom?.[name]?.path

  const RenderModule = (await getFromImportMap(renderPath, importMap)) as ComponentType<any> | undefined
  if (!RenderModule) {
    if (process.env.NODE_ENV !== 'production') {
      throw Error(
        `Render module for collection with slug "${collectionSlug}" not found at path "${renderPath}". Check your import map and collection configuration.`
      )
    }
    return null
  }

  return <RenderModule data={data} config={config} importMap={importMap} {...props}/>
}

export type RenderedWWWModule<Data = any> = {
  config: SanitizedConfig,
  importMap: ImportMap,
  data: Data
} & Record<string, any>