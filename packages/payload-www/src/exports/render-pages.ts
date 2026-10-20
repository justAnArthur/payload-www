import { FooterPage } from '../render/pages/FooterPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { PagesPage } from '../render/pages/PagesPage'
import { PostsPage } from '../render/pages/PostsPage'
import { type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, createCollectionPageExports } from '../render/pages/createCollectionPageExports'
import { type CreateRootLayoutExportsArgs, type CreateRootLayoutExportsDeps, type CreateRootLayoutProvidersArgs, createRootLayoutExports } from '../render/pages/createRootLayoutExports'
import { type ResolveLocales, type RuntimeLocales, narrowRouting, resolveRouting } from '../render/pages/utils/resolveRouting'
import { type PagePathPrefix, type RoutingConfig, buildLocalizedPath } from '../render/pages/utils/buildLocalizedPath'
import { type LinkHrefOptions, linkHref } from '../render/pages/utils/linkHref'
import { type LocalesFromGlobalArgs, localesFromGlobal } from '../render/metadata/locales'
import { RootJsonLd } from '@justanarthur/payload-plugin-seo/root-jsonld'
import type { RootJsonLdProps } from '@justanarthur/payload-plugin-seo/root-jsonld'

const renderPages = { createCollectionPageExports, createRootLayoutExports, PagesPage, PostsPage, HeaderPage, FooterPage, RootJsonLd, localesFromGlobal, resolveRouting, narrowRouting, buildLocalizedPath, linkHref }

export default renderPages
export { createCollectionPageExports, createRootLayoutExports, PagesPage, PostsPage, HeaderPage, FooterPage, RootJsonLd, localesFromGlobal, resolveRouting, narrowRouting, buildLocalizedPath, linkHref, type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, type CreateRootLayoutExportsArgs, type CreateRootLayoutExportsDeps, type CreateRootLayoutProvidersArgs, type RootJsonLdProps, type ResolveLocales, type RuntimeLocales, type LocalesFromGlobalArgs, type LinkHrefOptions, type PagePathPrefix, type RoutingConfig }
