import { MemCoreRuntime, type HarnessContext } from './runtime.ts'
import type { MemCoreConfig } from './types.ts'

export { MEMCORE_SETTINGS_NAMESPACE, MemCoreSettingsSchema } from './config.ts'
export { MemoryStore, type ForgetResult } from './store.ts'
export type {
  MemCoreConfig, MemCoreMetrics, MemCoreSettings, MemoryKind, MemoryRecord, RememberInput, RetrievedMemory,
} from './types.ts'

/** Cordis loader identity. */
export const name = 'dsh-memcore'

/**
 * Install provider-neutral external memory into DSH.
 * @param ctx - DSH Cordis context.
 * @param config - optional plugin settings from the profile composition.
 */
export function apply(ctx: HarnessContext, config?: MemCoreConfig): void {
  new MemCoreRuntime(ctx, config)
}
