import { translateOperation } from '../translate/operation'
import { translator } from '../index'

export { translateOperation }

export { createTranslationStatusCollection } from '../review/collection'
export { TRANSLATION_STATUS_SLUG } from '../review/constants'

export type { TranslateResolver, TranslateResolverArgs, TranslateResolverResponse } from '../resolvers/types'

export default translator

export { translator }