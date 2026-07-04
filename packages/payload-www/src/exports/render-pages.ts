import {
  addCollectionsToSitemap,
  createCollectionPageExports,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageRouting
} from '../render/pages/createCollectionPageExports'
import {
  createRootLayoutExports,
  type CreateRootLayoutExportsArgs,
  type CreateRootLayoutExportsReturn,
  type CreateRootLayoutProvidersArgs
} from '../render/pages/createRootLayoutExports'
import { createStaticPageExports, type CreateStaticPageExportsArgs } from '../render/pages/createStaticPageExports'


import { PagesPage } from '../render/pages/PagesPage'
import { PostsPage } from '../render/pages/PostsPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { FooterPage } from '../render/pages/FooterPage'


export default {
  addCollectionsToSitemap,
  createCollectionPageExports,
  createRootLayoutExports,
  createStaticPageExports,
  HeaderPage,
  FooterPage,
  PagesPage,
  PostsPage
}

export {
  addCollectionsToSitemap,
  createCollectionPageExports,
  createRootLayoutExports,
  createStaticPageExports,
  HeaderPage,
  FooterPage,
  PagesPage,
  PostsPage,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type CreateRootLayoutExportsArgs,
  type CreateRootLayoutExportsReturn,
  type CreateRootLayoutProvidersArgs,
  type CreateStaticPageExportsArgs,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions,
  type PageRouting
}
