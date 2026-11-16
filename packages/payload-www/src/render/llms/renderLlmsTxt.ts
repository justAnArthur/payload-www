export type LlmsLink = {
  title: string
  url: string
  description?: string
  /** Page body as markdown; only `llms-full.txt` prints it. */
  content?: string
}

export type LlmsSection = {
  title: string
  links: LlmsLink[]
}

export type LlmsDocument = {
  name: string
  summary?: string
  /** Free-form markdown between the summary and the first section. */
  details?: string
  /** Printed as one line under the summary when set. */
  locales?: string[]
  sections: LlmsSection[]
  /** Free-form markdown appended after the generated sections. */
  extra?: string
}

const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim()
const linkText = (value: string) => oneLine(value).replace(/([[\]])/g, '\\$1')

function header(doc: LlmsDocument): string[] {
  const parts = [`# ${oneLine(doc.name)}`]
  if (doc.summary?.trim()) parts.push(`> ${oneLine(doc.summary)}`)
  if (doc.details?.trim()) parts.push(doc.details.trim())
  if (doc.locales && doc.locales.length > 1)
    parts.push(`Available languages: ${doc.locales.join(', ')}. Each page lists its translations as hreflang alternates.`)
  return parts
}

function footer(doc: LlmsDocument): string[] {
  return doc.extra?.trim() ? [doc.extra.trim()] : []
}

// page content sits under a `###` link heading, so its own headings start at `####`
const demoteHeadings = (markdown: string) =>
  markdown.replace(/^(#{1,6}) /gm, (_, hashes: string) => '#'.repeat(Math.min(hashes.length + 3, 6)) + ' ')

const nonEmpty =(sections: LlmsSection[]) => sections.filter(section => section.links.length > 0)

/** Renders the https://llmstxt.org index: a title, a summary and one link list per section. */
export function renderLlmsTxt(doc: LlmsDocument): string {
  const sections = nonEmpty(doc.sections).map(section => [
    `## ${oneLine(section.title)}`,
    section.links.map(link =>
      `- [${linkText(link.title)}](${link.url})${link.description?.trim() ? `: ${oneLine(link.description)}` : ''}`
    ).join('\n')
  ].join('\n\n'))

  return [...header(doc), ...sections, ...footer(doc)].join('\n\n') + '\n'
}

/** Renders `llms-full.txt`: the same index with every page's content inlined under its link. */
export function renderLlmsFullTxt(doc: LlmsDocument): string {
  const sections = nonEmpty(doc.sections).map(section => [
    `## ${oneLine(section.title)}`,
    ...section.links.map(link => [
      `### [${linkText(link.title)}](${link.url})`,
      link.description?.trim() ? `> ${oneLine(link.description)}` : '',
      demoteHeadings(link.content?.trim() ?? '')
    ].filter(Boolean).join('\n\n'))
  ].join('\n\n'))

  return [...header(doc), ...sections, ...footer(doc)].join('\n\n') + '\n'
}
