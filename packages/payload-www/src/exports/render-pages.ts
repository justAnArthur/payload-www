import { FooterPage } from '../render/pages/FooterPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { PagesPage } from '../render/pages/PagesPage'
import { PostsPage } from '../render/pages/PostsPage'
import { type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, createCollectionPageExports } from '../render/pages/createCollectionPageExports'
import { type CreateRootLayoutExportsArgs, type CreateRootLayoutExportsDeps, type CreateRootLayoutProvidersArgs, createRootLayoutExports } from '../render/pages/createRootLayoutExports'
import { RootJsonLd } from '@justanarthur/payload-plugin-seo/root-jsonld'
import type { RootJsonLdProps } from '@justanarthur/payload-plugin-seo/root-jsonld'

const renderPages = { createCollectionPageExports, createRootLayoutExports, PagesPage, PostsPage, HeaderPage, FooterPage, RootJsonLd }

export default renderPages
export { createCollectionPageExports, createRootLayoutExports, PagesPage, PostsPage, HeaderPage, FooterPage, RootJsonLd, type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, type CreateRootLayoutExportsArgs, type CreateRootLayoutExportsDeps, type CreateRootLayoutProvidersArgs, type RootJsonLdProps }
