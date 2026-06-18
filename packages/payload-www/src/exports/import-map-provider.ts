// `import-map-provider` is a tiny subpath that exposes only the
// importMap registration helpers. Hosts import `setImportMapProvider`
// from this subpath in `payload.config.ts` (a Node entrypoint that
// CANNOT touch the lib's `render-pages` subpath because that pulls
// in `createCollectionPageExports.tsx` which has `import 'server-only'`
// at the top and would throw at Node startup).
//
// The helpers live in this file (not in a separate `render/...`
// module) so bunup's dts resolver doesn't drop the implementations
// to `unknown` — every other shim that re-exports from another
// internal file has hit this phantom-export bug.

import type { ImportMap } from 'payload'

let importMapProvider: (() => Promise<ImportMap> | ImportMap) | null = null

export function setImportMapProvider(provider: () => Promise<ImportMap> | ImportMap): void {
  importMapProvider = provider
}

export async function getImportMap(): Promise<ImportMap> {
  if (!importMapProvider) return {}
  const result = await importMapProvider()
  return result ?? {}
}
