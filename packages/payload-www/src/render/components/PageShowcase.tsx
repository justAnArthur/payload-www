import type { Metadata } from 'next'
import * as React from 'react'
import type { ReactElement, ReactNode } from 'react'

export type PageShowcaseProps = {
  /** The lib-rendered page body (RenderBlocks output + JSON-LD scripts). */
  children: ReactNode
  /**
   * The Next.js `Metadata` object resolved by `createCollectionPageExports`'s
   * `generateMetadata`. The showcase renders the title, description,
   * Open Graph, and Twitter Card entries as a labeled list.
   */
  metadata: Metadata
  /**
   * The JSON-LD entries resolved by the lib. Rendered as `<pre>`
   * blocks inside a `<details>` element so visitors can see the
   * schema.org payload without it being a wall of JSON.
   */
  jsonLd: Array<{ id: string; schema: Record<string, unknown> }>
  /**
   * The `<LocaleSwitcher>` element the lib built from the page's
   * hreflang alternates. Mounted at the top of the sidebar.
   */
  localeSwitcher: ReactNode
  /** Heading above the metadata block. Default: `'Page metadata'`. */
  metadataHeading?: string
  /** Heading above the JSON-LD block. Default: `'JSON-LD'`. */
  jsonLdHeading?: string
}

/**
 * Two-column showcase layout that surfaces the page's metadata,
 * JSON-LD, and language switcher alongside the rendered body. Used
 * by the lib's `createCollectionPageExports` when the host passes
 * `showcase: { enabled: true }`. The default render is the bare
 * doc body + JSON-LD scripts (no sidebar).
 *
 * The layout is intentionally minimal — a `<div class="page-showcase">`
 * with `main` + `aside` columns, no styles. Hosts that want a fancier
 * layout override via their own CSS.
 */
export function PageShowcase({
  children,
  metadata,
  jsonLd,
  localeSwitcher,
  metadataHeading = 'Page metadata',
  jsonLdHeading = 'JSON-LD'
}: PageShowcaseProps): ReactElement {
  console.log('[WWW] render/components:PageShowcase jsonLdEntries=', jsonLd.length, 'hasOg=', Boolean(metadata.openGraph), 'hasTwitter=', Boolean(metadata.twitter), 'canonical=', metadata.alternates?.canonical)
  const og = metadata.openGraph as
    | { title?: string; description?: string; type?: string; url?: string; siteName?: string }
    | undefined
  const twitter = metadata.twitter as
    | { card?: string; title?: string; description?: string; site?: string; creator?: string }
    | undefined

  const rows: Array<[string, string | undefined]> = [
    ['Title', resolveTitle(metadata.title)],
    ['Description', metadata.description as string | undefined],
    ['Canonical', metadata.alternates?.canonical as string | undefined],
    [
      'Languages',
      metadata.alternates?.languages
        ? Object.entries(metadata.alternates.languages)
            .map(([locale, url]) => `${locale}: ${url}`)
            .join('\n')
        : undefined
    ],
    ['Open Graph title', og?.title],
    ['Open Graph description', og?.description],
    ['Open Graph type', og?.type],
    ['Open Graph url', og?.url],
    ['Open Graph site name', og?.siteName],
    ['Twitter card', twitter?.card],
    ['Twitter title', twitter?.title],
    ['Twitter description', twitter?.description],
    ['Twitter site', twitter?.site],
    ['Twitter creator', twitter?.creator]
  ]

  return (
    <div className="page-showcase grid gap-8 lg:grid-cols-[1fr_320px]">
      <main className="page-showcase__main">{children}</main>
      <aside className="page-showcase__sidebar flex flex-col gap-6 text-sm">
        <section className="page-showcase__locale">
          <h2 className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Language
          </h2>
          {localeSwitcher}
        </section>

        <section className="page-showcase__metadata">
          <h2 className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {metadataHeading}
          </h2>
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5">
            {rows
              .filter(([, value]) => value !== undefined && value !== '')
              .map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="m-0 whitespace-pre-wrap break-words font-mono text-xs">{value}</dd>
                </React.Fragment>
              ))}
          </dl>
        </section>

        {jsonLd.length > 0 ? (
          <section className="page-showcase__jsonld">
            <h2 className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {jsonLdHeading}
            </h2>
            {jsonLd.map(({ id, schema }) => (
              <details key={id} className="mb-2 rounded border border-border bg-muted/30 p-2">
                <summary className="cursor-pointer font-mono text-xs">{id}</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug">
                  {JSON.stringify(schema, null, 2)}
                </pre>
              </details>
            ))}
          </section>
        ) : null}
      </aside>
    </div>
  )
}

function resolveTitle(title: Metadata['title']): string | undefined {
  if (!title) return undefined
  if (typeof title === 'string') return title
  // Title can be `null` or a `TemplateString` shape. Narrow defensively.
  if (title === null) return undefined
  const t = title as { absolute?: string; template?: string; default?: string }
  return t.absolute ?? t.template ?? t.default
}
