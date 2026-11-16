import { createSitemapFromCollections } from '../render/pages/createCollectionPageExports'
import { seedPayloadCache } from '../render/metadata/query'
import {
  buildLlmsDocument,
  createLlmsFullTxtFromCollections,
  createLlmsTxtFromCollections,
  LLMS_GLOBAL_DEFAULT_SLUG
} from '../render/llms/createLlmsTxt'
import { fieldsToMarkdown, lexicalToPlainText } from '../render/llms/fieldsToMarkdown'
import { renderLlmsFullTxt, renderLlmsTxt } from '../render/llms/renderLlmsTxt'

export type { CollectionDocEntry } from '../render/pages/createCollectionPageExports'
export type { LlmsFullTxtOptions, LlmsGlobalData, LlmsSource, LlmsTxtOptions } from '../render/llms/createLlmsTxt'
export type { LlmsBlockData, RichTextToMarkdown, SerializeBlock } from '../render/llms/fieldsToMarkdown'
export type { LlmsDocument, LlmsLink, LlmsSection } from '../render/llms/renderLlmsTxt'

export {
  createSitemapFromCollections,
  seedPayloadCache,
  createLlmsTxtFromCollections,
  createLlmsFullTxtFromCollections,
  buildLlmsDocument,
  fieldsToMarkdown,
  lexicalToPlainText,
  renderLlmsTxt,
  renderLlmsFullTxt,
  LLMS_GLOBAL_DEFAULT_SLUG
}

export default {
  createSitemapFromCollections,
  seedPayloadCache,
  createLlmsTxtFromCollections,
  createLlmsFullTxtFromCollections
}
