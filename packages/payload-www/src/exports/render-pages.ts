import {
  createLayoutExports,
  handleLocale,
  type CreateLayoutExportsOptions,
} from '../render/pages/createLayoutExports'
import {
  createCollectionPageExports,
  addCollectionsToSitemap,
  type MetadataOptions,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type PageExtendProps,
  type JsonLdEntry,
  type JsonLdOutput,
} from '../render/pages/createCollectionPageExports'

export default {
  createLayoutExports,
  handleLocale,
  createCollectionPageExports,
  addCollectionsToSitemap,
}

export {
  createLayoutExports,
  handleLocale,
  createCollectionPageExports,
  addCollectionsToSitemap,
  type CreateLayoutExportsOptions,
  type MetadataOptions,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type PageExtendProps,
  type JsonLdEntry,
  type JsonLdOutput,
} from '../render/pages/index'
