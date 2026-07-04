import type { ImportMap } from 'payload'


export function setImportMapProvider(_provider: () => Promise<ImportMap> | ImportMap): void {


}


export async function getImportMap(): Promise<ImportMap> {
  return {}
}
