// @justanarthur/payload-www (root)
// Client-safe surface. The only thing that lives here is `LivePreviewListener`
// — the one client component (uses `useRouter` from `next/navigation`).
// Everything else lives in `./server` and must be imported from
// `@justanarthur/payload-www/server`.

import { LivePreviewListener, type LivePreviewListenerProps } from '../render/components/LivePreviewListener'

export { LivePreviewListener, type LivePreviewListenerProps }
export default LivePreviewListener
