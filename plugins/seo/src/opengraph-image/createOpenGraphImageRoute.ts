import type { ComponentType } from 'react'
import { createElement } from 'react'

import type { ImportMap, SanitizedCollectionConfig, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import type { SiteDefaults } from '../types'
import { extractSEOMetaForImage, type SEOMetaImageProps } from './extractSEOMetaForImage'
import { getCollectionOGImagePath } from './getCollectionOGImagePath'


export type OpenGraphImageRouteParams = Record<string, string | string[] | undefined>

export type OpenGraphImageRouteContext = {
  params: Promise<OpenGraphImageRouteParams>
}


export type OpenGraphImageRoute = (
  ctx: OpenGraphImageRouteContext
) => Promise<ImageResponse | undefined> | undefined






type ImageResponse = {
  
  
  
}

const loadImageResponse = async (): Promise<new (...args: any[]) => unknown> => {
  
  
  const mod = (await import('next/og')) as unknown as {
    ImageResponse: new (...args: any[]) => unknown
  }
  return mod.ImageResponse
}

const toParamString = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v

const toParamNumber = (v: string | string[] | undefined): number | undefined => {
  const s = toParamString(v)
  if (s === undefined) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

export type CreateOpenGraphImageRouteArgs = {
  
  config: SanitizedConfig | Promise<SanitizedConfig>

  
  collectionSlug: string

  
  slugParam?: string

  
  localeParam?: string

  
  size?: { width: number; height: number }

  
  contentType?: 'image/png' | 'image/jpeg'

  
  importMap?: ImportMap

  
  component?: ComponentType<SEOMetaImageProps>

  
  fallbackTitle?: string

  
  fallbackDescription?: string

  
  fallbackImage?: string

  
  type?: 'website' | 'article'

  
  fetchDoc?: (args: {
    id: string | number | undefined
    locale: string | undefined
    payload: undefined
    collectionSlug: string
    slugField: string
  }) => Promise<Record<string, unknown> | null>


  siteDefaults?: SiteDefaults
}


export const createOpenGraphImageRoute =
  (args: CreateOpenGraphImageRouteArgs): OpenGraphImageRoute =>
  async (ctx) => {
    const slugParam = args.slugParam ?? 'slug'
    const localeParam = args.localeParam ?? 'locale'
    const size = args.size ?? { width: 1200, height: 630 }
    const contentType = args.contentType ?? 'image/png'

    const params = await ctx.params
    const rawSlug = toParamString(params[slugParam])
    const locale = toParamString(params[localeParam]) ?? undefined

    const sanitizedConfig = await args.config

    const collection = sanitizedConfig.collections?.find(
      (c): c is SanitizedCollectionConfig => c.slug === args.collectionSlug
    )

    
    
    
    
    let Component: ComponentType<SEOMetaImageProps> | undefined = args.component
    if (!Component) {
      const ogImagePath = getCollectionOGImagePath(collection)
      if (!ogImagePath) return undefined
      const importMap = args.importMap ?? sanitizedConfig.admin?.importMap
      if (!importMap) {
        
        
        
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(
            `[payload-plugin-seo] Collection "${args.collectionSlug}" has custom.ogImage set but no import map was found. Pass \`importMap\` explicitly or ensure the host's Payload config exposes \`admin.importMap\`.`
          )
        }
        return undefined
      }
      
      
      
      
      
      const importMapRecord = importMap as unknown as Record<string, unknown>
      const resolved = importMapRecord[ogImagePath.includes('#') ? ogImagePath : `${ogImagePath}#default`]
      if (!resolved) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(
            `[payload-plugin-seo] Collection "${args.collectionSlug}" declares custom.ogImage="${ogImagePath}" but no matching entry was found in the import map.`
          )
        }
        return undefined
      }
      Component = resolved as ComponentType<SEOMetaImageProps>
    }

    
    
    
    
    
    
    let doc: Record<string, unknown> | null = null
    if (args.fetchDoc) {
      const numericId = toParamNumber(rawSlug)
      const slugField = slugParam === 'id' ? 'id' : slugParam
      doc = await args.fetchDoc({
        id: numericId ?? rawSlug,
        locale,
        payload: undefined, 
        collectionSlug: args.collectionSlug,
        slugField
      })
    } else {
      const payload = await getPayload({ config: sanitizedConfig })
      if (rawSlug !== undefined) {
        const numericId = toParamNumber(rawSlug)
        if (numericId !== undefined) {
          doc = (await payload.findByID({
            collection: args.collectionSlug,
            id: numericId,
            locale,
            draft: false,
            depth: 0
          })) as Record<string, unknown> | null
        } else {
          const result = await payload.find({
            collection: args.collectionSlug,
            draft: false,
            depth: 0,
            limit: 1,
            pagination: false,
            overrideAccess: false,
            where: { [slugParam]: { equals: rawSlug } },
            locale
          })
          doc = (result.docs?.[0] as Record<string, unknown> | undefined) ?? null
        }
      }
    }

    const meta = (doc?.meta ?? null) as Parameters<typeof extractSEOMetaForImage>[0]['meta']
    const fallbackTitle =
      args.fallbackTitle ?? (typeof doc?.title === 'string' ? doc.title : undefined)

    const props = extractSEOMetaForImage({
      meta,
      fallback: {
        title: fallbackTitle,
        description: args.fallbackDescription,
        image: args.fallbackImage
      },
      locale,
      type: args.type,
      siteDefaults: args.siteDefaults
    })

    const ImageResponseCtor = await loadImageResponse()
    
    
    
    
    const element = createElement(Component, props)
    return new ImageResponseCtor(element as never, {
      ...size,
      headers: { 'content-type': contentType }
    }) as unknown as ImageResponse
  }
