import { PagesPage } from '../render/pages/PagesPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { FooterPage } from '../render/pages/FooterPage'
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
  createCollectionPageExports,
  addCollectionsToSitemap,
  PagesPage,
  HeaderPage,
  FooterPage
}

export {
  addCollectionsToSitemap,
  createCollectionPageExports,
  PagesPage,
  HeaderPage,
  FooterPage,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageExtendProps
}
