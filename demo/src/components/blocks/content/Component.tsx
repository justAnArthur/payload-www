import React from 'react'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props
  return (
    <div className="container my-16">
      <div className="flex flex-col gap-4">
        {columns?.map((col, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p>{col.text}</p>
            {col.enableLink && col.linkUrl && (
              <a className="underline" href={col.linkUrl} rel="noopener noreferrer">
                {col.linkLabel || col.linkUrl}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { ContentBlock }
export default ContentBlock