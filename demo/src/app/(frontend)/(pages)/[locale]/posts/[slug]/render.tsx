import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Post } from '@/payload-types'

// ponytail: the lib's `renderWWWDataModule` passes the doc as the `data` prop
// (the `RenderedWWWModule` type), not `doc` as the lib's own PostsPage does.
// Pointing `renderPath` at the page file itself would also create a recursion
// (page → default_ → renderWWWDataModule → page), so we give posts their own
// render module like categories already do.
type PostRenderProps = {
  data: Post
  locale: string
}

export default async function PostRender({ data: post, locale: _locale }: PostRenderProps) {
  return (
    <article className="posts-page prose prose-neutral dark:prose-invert mx-auto max-w-3xl py-10">
      <header className="posts-page__header not-prose mb-8">
        <h1 className="posts-page__title text-4xl font-semibold tracking-tight">{post.title}</h1>
        {post.excerpt && (
          <p className="posts-page__excerpt mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        )}
      </header>
      {post.content && (
        <div className="posts-page__content">
          <RichText data={post.content} />
        </div>
      )}
    </article>
  )
}
