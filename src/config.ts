import z from '@deepseek-ai/schemastery'
import type { MemCoreConfig, MemCoreSettings } from './types.ts'

/** Namespace shared by the Host settings service and the Web toolbar button. */
export const MEMCORE_SETTINGS_NAMESPACE = 'memcore'

/** Persisted, live setting that turns retrieval and capture on or off. */
export const MemCoreSettingsSchema: z<MemCoreSettings> = z.object({
  enabled: z.boolean().default(true),
})

/** Normalized plugin options; operational choices remain explicit and local. */
export interface ResolvedMemCoreConfig {
  readonly enabled: boolean
  readonly databasePath: string
  readonly tokenBudget: number
  readonly maxRecords: number
  readonly captureEnabled: boolean
  readonly minImportance: number
}

/** Resolve untrusted Cordis configuration into a safe operational configuration. */
export function resolveConfig(input: MemCoreConfig | undefined): ResolvedMemCoreConfig {
  const tokenBudget = input?.tokenBudget ?? 1_200
  const maxRecords = input?.maxRecords ?? 8
  const minImportance = input?.capture?.minImportance ?? 0.72
  if (!Number.isInteger(tokenBudget) || tokenBudget < 100 || tokenBudget > 16_000) {
    throw new TypeError('memcore tokenBudget must be an integer from 100 to 16000')
  }
  if (!Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > 64) {
    throw new TypeError('memcore maxRecords must be an integer from 1 to 64')
  }
  if (typeof minImportance !== 'number' || minImportance < 0 || minImportance > 1) {
    throw new TypeError('memcore capture.minImportance must be a number from 0 to 1')
  }
  return {
    enabled: input?.enabled ?? true,
    databasePath: input?.databasePath ?? '.dsh/memcore.sqlite',
    tokenBudget,
    maxRecords,
    captureEnabled: input?.capture?.enabled ?? true,
    minImportance,
  }
}
