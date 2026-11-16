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

// page content sits under a `###` link heading, so its top heading level becomes `####` and the
// rest keep their distance to it (capped at `######`). Lines inside fenced code are left alone.
function demoteHeadings(markdown: string) {
  const lines = markdown.split('\n')
  let fence: string | null = null
  const headings = lines.map(line => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker && (!fence || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence ? null : marker
      return 0
    }
    return fence ? 0 : /^(#{1,6}) /.exec(line)?.[1].length ?? 0
  })
  const levels = headings.filter(Boolean)
  if (levels.length === 0) return markdown
  const shift = 4 - Math.min(...levels)
  return lines.map((line, i) =>
    headings[i] ? '#'.repeat(Math.min(headings[i] + shift, 6)) + line.slice(headings[i]) : line
  ).join('\n')
}

const nonEmpty = (sections: LlmsSection[]) => sections.filter(section => section.links.length > 0)

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
