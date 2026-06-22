export { extractScalars, lexicalToPlainText, type ExtractedDoc, type ScalarValue } from './extractScalars'
export { runAutoGenerate, type RunAutoGenerateOptions } from './runAutoGenerate'

// bunup with `sideEffects: false` drops this re-export module when only
// referenced indirectly through a closure. The side-effecting export
// below pins the module so the bundler keeps it (no runtime cost — the
// value is just `undefined`).
export const __autoGenerateModulePin: undefined = undefined
