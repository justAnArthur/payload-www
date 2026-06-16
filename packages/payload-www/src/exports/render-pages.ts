import { createCollectionPageExports, type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, type JsonLdEntry, type JsonLdOutput, type MetadataOptions } from '../render/pages/createCollectionPageExports'
import { addCollectionsToSitemap } from '../render/pages/createCollectionPageExports'
// Leaf imports — barrel imports through `render/pages/index.ts` drag
// `LivePreviewListener` (a 'use client' component) into the static
// graph, and bunup then marks the whole subpath as a client boundary.
import { PagesPage } from '../render/pages/PagesPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { FooterPage } from '../render/pages/FooterPage'

export default {
  addCollectionsToSitemap,
  createCollectionPageExports,
  HeaderPage,
  FooterPage,
  PagesPage
}

export {
  addCollectionsToSitemap,
  createCollectionPageExports,
  HeaderPage,
  FooterPage,
  PagesPage,
  type CreateCollectionPageExportsArgs,
  type CreateCollectionPageExportsDeps,
  type JsonLdEntry,
  type JsonLdOutput,
  type MetadataOptions
}
