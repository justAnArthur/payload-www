import type { DocumentInfoContext } from '@payloadcms/ui'
import type { CollectionConfig, CollectionSlug, Field, GlobalConfig, GlobalSlug, PayloadRequest } from 'payload'


export type FieldsOverride = (args: { defaultFields: Field[] }) => Field[]

export type PartialDocumentInfoContext = Pick<
  DocumentInfoContext,
  | 'collectionSlug'
  | 'docPermissions'
  | 'globalSlug'
  | 'hasPublishPermission'
  | 'hasPublishedDoc'
  | 'hasSavePermission'
  | 'id'
  | 'initialData'
  | 'initialState'
  | 'preferencesKey'
  | 'title'
  | 'versionCount'
>


export type SiteDefaults = {

  shared?: {

    name?: string


    description?: string


    logo?: string
  }


  organization?: {

    sameAs?: string[]
  }


  product?: {

    offers?: {

      price?: string


      priceCurrency?: string


      availability?: string
    }
  }


  twitterSite?: string

  twitterCreator?: string


  defaultOgImage?: string


  keywords?: string
}


export type SEOMeta = {


  title?: string

  description?: string

  keywords?: string

  image?: any


  ogTitle?: string
  ogDescription?: string
  ogImage?: any
  ogType?: 'website' | 'article' | 'profile' | 'book' | 'music' | 'video'


  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: any
}


export type GenerateSEO<T = any> = (
  args: {
    collectionConfig?: CollectionConfig
    doc: T
    globalConfig?: GlobalConfig
    locale?: string
    req: PayloadRequest
  } & PartialDocumentInfoContext
) => Promise<Partial<SEOMeta>> | Partial<SEOMeta>


export type DeriveFrom = 'allScalars' | Partial<Record<keyof SEOMeta, string>>


export type AutoGenerateConfig = {
  
  mode?: 'off' | 'onCreate' | 'onUpdate' | 'onCreateOrUpdate'
  
  onlyFillEmpty?: boolean
  
  deriveFrom?: DeriveFrom
  
  timeoutMs?: number
}

export type SEOPluginConfig = {
  
  autoGenerate?: AutoGenerateConfig | false
  
  collections?: CollectionSlug[]
  
  fields?: FieldsOverride
  
  generateSEO?: GenerateSEO
  
  globals?: GlobalSlug[]
  
  interfaceName?: string
  
  openaiApiKey?: string
  
  tabbedUI?: boolean

  
  uploadsCollection?: CollectionSlug
}
