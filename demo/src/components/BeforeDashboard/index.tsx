import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to the payload-www demo.</h4>
      </Banner>
      <ul className={`${baseClass}__instructions`}>
        <li>
          Open the <a href="/admin/collections/pages">Pages</a> collection and create a
          page. The page&apos;s blocks will render at <code>/your-page-slug</code>.
        </li>
        <li>
          The <code>Content</code> block is wired through{' '}
          <code>createWWWConfig#blocks</code> in{' '}
          <code>src/payload.config.ts</code>. Add more blocks there and they show up in
          the editor automatically.
        </li>
        <li>
          The demo currently opts out of the three default workspace
          plugins (<code>seo</code>, <code>imageHash</code>,{' '}
          <code>translator</code>) — see <code>payload.config.ts</code> for
          the comment. To re-enable, set them to an options object instead
          of <code>false</code>.
        </li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
