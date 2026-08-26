/** One safely stored external-memory item. */
export interface MemoryRecord {
  readonly id: string
  readonly scope: string
  readonly kind: MemoryKind
  readonly memoryKey: string | null
  readonly value: string
  readonly confidence: number
  readonly importance: number
  readonly sourceKind: string
  readonly sourceRef: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly validFrom: string
  readonly validUntil: string | null
  readonly supersedes: string | null
  readonly supersededBy: string | null
  readonly status: MemoryStatus
}

/** Retrieval result with a score local to the query. */
export interface RetrievedMemory extends MemoryRecord {
  readonly score: number
}

/** The four memory classes exposed by MemCore. */
export type MemoryKind = 'working' | 'episodic' | 'semantic' | 'procedural'

/** Lifecycle state of a versioned record. */
export type MemoryStatus = 'active' | 'superseded' | 'archived'

/** Input used to create or replace one record. */
export interface RememberInput {
  readonly scope: string
  readonly kind: MemoryKind
  readonly memoryKey?: string
  readonly value: string
  readonly confidence?: number
  readonly importance?: number
  readonly sourceKind: string
  readonly sourceRef?: string
}

/** A durable retrieval observation for debugging and benchmark analysis. */
export interface RetrievalTrace {
  readonly id: string
  readonly scope: string
  readonly query: string
  readonly recordIds: readonly string[]
  readonly tokenEstimate: number
  readonly createdAt: string
}

/** Numeric plugin diagnostics suitable for dsh-benchup's custom metrics. */
export interface MemCoreMetrics {
  memoryQueries: number
  memoryHits: number
  memoryMisses: number
  recordsInjected: number
  memoryTokens: number
  recordsWritten: number
  recordsSuperseded: number
  repeatedFileReads: number
  repeatedSearches: number
  repeatedCommands: number
  duplicateToolCalls: number
}

/** Values supported in MemCore's persistent DSH settings section. */
export interface MemCoreSettings {
  enabled: boolean
}

/** Deployment configuration, supplied through the Cordis plugin entry. */
export interface MemCoreConfig {
  enabled?: boolean
  databasePath?: string
  tokenBudget?: number
  maxRecords?: number
  capture?: {
    enabled?: boolean
    minImportance?: number
  }
}
