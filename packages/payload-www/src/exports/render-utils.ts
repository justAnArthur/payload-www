import { createPreviewHandler, type CreatePreviewHandlerOptions } from '../render/preview/createPreviewHandler'
import { createSitemapFile, type CreateSitemapFileOptions, type SitemapFunction } from '../render/sitemap/createSitemapFile'
import { LocaleSwitcher, type LocaleSwitcherProps } from '../render/components/LocaleSwitcher'

export default { createPreviewHandler, createSitemapFile, LocaleSwitcher }

export {
  createPreviewHandler,
  createSitemapFile,
  LocaleSwitcher,
  type CreatePreviewHandlerOptions,
  type CreateSitemapFileOptions,
  type SitemapFunction,
  type LocaleSwitcherProps
}
