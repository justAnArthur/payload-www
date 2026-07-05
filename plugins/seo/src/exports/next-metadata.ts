import { generateMeta, type GenerateMetaArgs, type SEOMetaShape } from '../generateMeta'
import { createSiteDefaults, type CreateSiteDefaultsArgs } from '../siteDefaults/createSiteDefaults'
import type { SiteDefaults } from '../types'

const nextMetadata = { generateMeta, createSiteDefaults }

export default nextMetadata
export { createSiteDefaults, generateMeta }
export type { CreateSiteDefaultsArgs, GenerateMetaArgs, SEOMetaShape, SiteDefaults }