import { METADATA_GLOBAL_DEFAULT_SLUG, createMetadataGlobal, type CreateMetadataGlobalOptions } from '../globals/createMetadataGlobal'
import { LLMS_GLOBAL_DEFAULT_SLUG, createLlmsGlobal, type CreateLlmsGlobalOptions } from '../globals/createLlmsGlobal'

const globals = {
  METADATA_GLOBAL_DEFAULT_SLUG,
  createMetadataGlobal,
  LLMS_GLOBAL_DEFAULT_SLUG,
  createLlmsGlobal,
}

export default globals
export { createMetadataGlobal, METADATA_GLOBAL_DEFAULT_SLUG, createLlmsGlobal, LLMS_GLOBAL_DEFAULT_SLUG }
export type { CreateMetadataGlobalOptions, CreateLlmsGlobalOptions }
