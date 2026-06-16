import { createPreviewHandler as _createPreviewHandler, type CreatePreviewHandlerOptions } from '../render/preview/createPreviewHandler'
import { createSitemapHandler as _createSitemapHandler, type CreateSitemapHandlerOptions } from '../render/sitemap/createSitemapHandler'

// Force value-level bindings — pure re-exports get tree-shaken
// by bunup because the entry is treated as a barrel. The const
// assignments keep the symbols alive in the dist.
export const createPreviewHandler = _createPreviewHandler
export const createSitemapHandler = _createSitemapHandler

export type { CreatePreviewHandlerOptions, CreateSitemapHandlerOptions }
