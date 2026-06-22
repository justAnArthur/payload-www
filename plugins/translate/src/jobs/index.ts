// jobs — auto-translation task, workflow, and scheduling hooks.
// Host wires the returned task + workflow into
// `payload.config.ts → jobs: { tasks, workflows }`, and the hook
// factories into collection/global `afterChange`.

// Leaf imports (not a barrel) — see lib-bundling-bunup memory: bunup's
// DCE drops named imports when consumers reach them through a barrel
// re-export, even with splitting:false. Each symbol is imported from
// its source file directly so the binding survives bundling.

export { TRANSLATE_TASK_SLUG, TRANSLATE_WORKFLOW_SLUG } from './constants'

export { createTranslateTask } from './createTranslateTask'
export type { CreateTranslateTaskOptions, TranslateTaskConfig } from './createTranslateTask'

export { createTranslateWorkflow } from './createTranslateWorkflow'
export type { CreateTranslateWorkflowOptions, TranslateWorkflowConfig } from './createTranslateWorkflow'

export { createAutoTranslateCollectionHook } from './createAutoTranslateCollectionHook'
export type { CreateAutoTranslateCollectionHookOptions } from './createAutoTranslateCollectionHook'

export { createAutoTranslateGlobalHook } from './createAutoTranslateGlobalHook'
export type { CreateAutoTranslateGlobalHookOptions } from './createAutoTranslateGlobalHook'
