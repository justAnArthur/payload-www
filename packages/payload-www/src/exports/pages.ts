import { FooterPage } from '../render/pages/FooterPage'
import { HeaderPage } from '../render/pages/HeaderPage'
import { PagesPage } from '../render/pages/PagesPage'
import { type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps, createCollectionPageExports } from '../render/pages/createCollectionPageExports'

const pages = { createCollectionPageExports, PagesPage, HeaderPage, FooterPage }

export default pages
export { createCollectionPageExports, PagesPage, HeaderPage, FooterPage, type CreateCollectionPageExportsArgs, type CreateCollectionPageExportsDeps }
