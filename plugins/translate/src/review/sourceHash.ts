import { createHash } from 'node:crypto'

import type { TranslatableField } from '../translate/types'

/** fingerprint of the source copy; a changed hash marks existing translations stale */
export const sourceHash = (fields: TranslatableField[]) =>
  createHash('sha1')
    .update(JSON.stringify(fields.map(({ path, source }) => [path, source])))
    .digest('hex')
