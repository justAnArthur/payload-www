import React from 'react'

import { CMSLink } from '@/components/Link'
import type { CtaBlock as CtaBlockProps } from '@/payload-types'

const CtaBlock: React.FC<CtaBlockProps> = ({ heading, body, link }) => {
  return (
    <section className="container my-16 rounded-lg border bg-card p-8 text-card-foreground">
      {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
      {body ? <p className="mt-3 text-muted-foreground">{body}</p> : null}
      {link ? (
        <div className="mt-6">
          <CMSLink {...link} appearance="default" />
        </div>
      ) : null}
    </section>
  )
}

export { CtaBlock }
export default CtaBlock