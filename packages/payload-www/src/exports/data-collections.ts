import {
  createPagesCollection,
  type CreatePagesCollectionOptions,
  HOME_PAGE_SLUG,
  PAGES_SLUG,
  pageSlugNestedDivider
} from '../data/collections/Pages/index'
import { createHeaderGlobal, type CreateHeaderGlobalOptions } from '../data/collections/globals/Header/config'
import { createFooterGlobal, type CreateFooterGlobalOptions } from '../data/collections/globals/Footer/config'
import { generatePreviewPath } from '../data/collections/previewPath'

export default {
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  pageSlugNestedDivider,
  PAGES_SLUG
}

export {
  createPagesCollection,
  createHeaderGlobal,
  createFooterGlobal,
  generatePreviewPath,
  HOME_PAGE_SLUG,
  pageSlugNestedDivider,
  PAGES_SLUG,
  type CreatePagesCollectionOptions,
  type CreateHeaderGlobalOptions,
  type CreateFooterGlobalOptions
} from '../data/collections/index'
