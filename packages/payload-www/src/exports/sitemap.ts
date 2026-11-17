import { createSitemapFromCollections } from '../render/pages/createCollectionPageExports'
import { seedPayloadCache } from '../render/metadata/query'
import {
  buildLlmsDocument,
  createLlmsFullTxtFromCollections,
  createLlmsTxtFromCollections,
  LLMS_GLOBAL_DEFAULT_SLUG
} from '../render/llms/createLlmsTxt'
import { fieldsToMarkdown, lexicalToPlainText } from '../render/llms/fieldsToMarkdown'
import { createMarkdownFromCollections, renderMarkdownPage } from '../render/llms/createMarkdownPages'
import { createLinkResolver } from '../render/llms/linkResolver'
import { renderLlmsFullTxt, renderLlmsTxt } from '../render/llms/renderLlmsTxt'

export type { CollectionDocEntry } from '../render/pages/createCollectionPageExports'
export type { LlmsFullTxtOptions, LlmsGlobalData, LlmsSource, LlmsTxtOptions } from '../render/llms/createLlmsTxt'
export type { LlmsBlockData, ResolveLink, RichTextToMarkdown, SerializeBlock } from '../render/llms/fieldsToMarkdown'
export type { MarkdownPagesOptions, MarkdownRouteContext, MarkdownSource } from '../render/llms/createMarkdownPages'
export type { LinkResolverArgs } from '../render/llms/linkResolver'
export type { LlmsDocument, LlmsLink, LlmsSection } from '../render/llms/renderLlmsTxt'

export {
  createSitemapFromCollections,
  seedPayloadCache,
  createLlmsTxtFromCollections,
  createLlmsFullTxtFromCollections,
  createMarkdownFromCollections,
  renderMarkdownPage,
  createLinkResolver,
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
  createLlmsFullTxtFromCollections,
  createMarkdownFromCollections
}
