import type { ImportMap } from 'payload'

/**
 * Marker export kept for backwards compatibility with hosts that
 * imported `setImportMapProvider` / `getImportMap` from earlier
 * versions of the lib. New code should pass the importMap directly
 * to `createRootLayoutExports` and `createCollectionPageExports` —
 * no global state, no module-load-time coupling.
 *
 * The functions are no-ops. The lib reads the importMap exclusively
 * from the per-factory `importMap` option now.
 *
 * @deprecated pass `importMap` to the factories instead.
 */
export function setImportMapProvider(_provider: () => Promise<ImportMap> | ImportMap): void {
  // no-op — kept only so existing `payload.config.ts` imports don't
  // fail at module load. New code shouldn't call this.
}

/**
 * @deprecated pass `importMap` to the factories instead. Always
 * returns `{}` now — the lib never reads global state.
 */
export async function getImportMap(): Promise<ImportMap> {
  return {}
}
