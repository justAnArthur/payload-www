import type { Plugin } from 'payload'

// The lib's `createWWWConfig` applies its three internal workspace
// plugins by default. The demo doesn't re-register them here —
// re-adding them would duplicate endpoints and double-load field groups.
// The demo is a showcase for `payload-www`, not for the internal
// workspace plugins; those have their own workspaces (`plugins/...`)
// and their own demos. The demo currently opts out of all three in
// `payload.config.ts` because the lib's eager plugin construction runs
// from a server context and trips Next.js's server/client boundary
// check. See the demo-cleanup deliverable.
export const plugins: Plugin[] = []
