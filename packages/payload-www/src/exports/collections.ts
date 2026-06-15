import { createPagesCollection, type CreatePagesCollectionOptions } from '../collections/Pages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../collections/globals/Footer/config'
import { generatePreviewPath } from '../collections/previewPath'
import { HOME_PAGE_SLUG, pageSlugNestedDivider, PAGES_SLUG } from '../collections/Pages/index'

export default {
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  pageSlugNestedDivider,
  PAGES_SLUG,
}

export {
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  type CreatePagesCollectionOptions,
  type CreateHeaderGlobalOptions,
  type CreateFooterGlobalOptions,
}
