import type { Category, Post } from '@/payload-types'

import Link from 'next/link'

type CategoryPostsRenderProps = {
  data: Category
  locale: string
  posts?: Post[]
}

export default async function CategoryPostsRender({ data: category, locale, posts = [] }: CategoryPostsRenderProps) {
  const visible = posts.filter((p) => p._status === 'published' || p._status === undefined)

  return (
    <section className="container my-16">
      <h1 className="text-3xl font-semibold tracking-tight">{category.title}</h1>
      <p className="mt-2 text-muted-foreground">
        Posts in <code>{category.slug}</code> ({visible.length})
      </p>

      {visible.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No posts in this category yet.</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {visible.map((post) => (
            <li key={post.id}>
              <Link className="underline" href={`/${locale}/posts/${post.slug}`}>
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}