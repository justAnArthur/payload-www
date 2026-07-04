import type { ReactElement } from 'react'

import { RichText } from '@payloadcms/richtext-lexical/react'
import { RenderedWWWModule } from "../renderWWWModule"

export async function PostsPage({ doc, locale, ...props }: RenderedWWWModule): Promise<ReactElement> {
  return (
    <article className="posts-page prose prose-neutral dark:prose-invert mx-auto max-w-3xl py-10">
      <header className="posts-page__header not-prose mb-8">
        <h1 className="posts-page__title text-4xl font-semibold tracking-tight">{doc.title}</h1>
        {doc.excerpt &&
          <p className="posts-page__excerpt mt-3 text-lg text-muted-foreground">{doc.excerpt}</p>}
      </header>
      {doc.content &&
        <div className="posts-page__content">
          <RichText data={doc.content}/>
        </div>}
    </article>
  )
}
