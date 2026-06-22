import { createCollectionPageExports, type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, type JsonLdEntry, type JsonLdOutput, type MetadataOptions, type PageRouting, type ShowcaseOptions } from '../render/pages/createCollectionPageExports'
import { addCollectionsToSitemap } from '../render/pages/createCollectionPageExports'
import { createRootLayoutExports, type CreateRootLayoutExportsArgs, type CreateRootLayoutExportsReturn, type CreateRootLayoutProvidersArgs } from '../render/pages/createRootLayoutExports'
import { createStaticPageExports, type CreateStaticPageExportsArgs } from '../render/pages/createStaticPageExports'
import { PageShowcase as _PageShowcase, type PageShowcaseProps } from '../render/components/PageShowcase'
// Leaf imports — barrel imports through `render/pages/index.ts` drag
// `LivePreviewListener` (a 'use client' component) into the static
// graph, and bunup then marks the whole subpath as a client boundary.
import { PagesPage } from '../render/pages/PagesPage'
import { PostsPage } from '../render/pages/PostsPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { FooterPage } from '../render/pages/FooterPage'

// Force value-level binding — pure re-exports get tree-shaken by
// bunup because the entry is treated as a barrel. The const
// assignment keeps the symbol alive in the dist.
export const PageShowcase = _PageShowcase

export default {
  addCollectionsToSitemap,
  createCollectionPageExports,
  createRootLayoutExports,
  createStaticPageExports,
  HeaderPage,
  FooterPage,
  PagesPage,
  PostsPage,
  PageShowcase
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
  type PageRouting,
  type PageShowcaseProps,
  type ShowcaseOptions
}
