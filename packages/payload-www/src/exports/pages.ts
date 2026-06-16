import { createLayoutExports, type CreateLayoutExportsOptions, handleLocale } from '../render/pages/createLayoutExports'
import {
  addCollectionsToSitemap,
  createCollectionPageExports,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageExtendProps
} from '../render/pages/createCollectionPageExports'

export default {
  createLayoutExports,
  handleLocale,
  createCollectionPageExports,
  addCollectionsToSitemap
}

export {
  addCollectionsToSitemap,
  createCollectionPageExports,
  createLayoutExports,
  handleLocale,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type CreateLayoutExportsOptions,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageExtendProps
}
