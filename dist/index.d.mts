import z from "@deepseek-ai/schemastery";

//#region src/types.d.ts
/** One safely stored external-memory item. */
interface MemoryRecord {
  readonly id: string;
  readonly scope: string;
  readonly kind: MemoryKind;
  readonly memoryKey: string | null;
  readonly value: string;
  readonly confidence: number;
  readonly importance: number;
  readonly sourceKind: string;
  readonly sourceRef: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly validFrom: string;
  readonly validUntil: string | null;
  readonly supersedes: string | null;
  readonly supersededBy: string | null;
  readonly status: MemoryStatus;
}
/** Retrieval result with a score local to the query. */
interface RetrievedMemory extends MemoryRecord {
  readonly score: number;
}
/** The four memory classes exposed by MemCore. */
type MemoryKind = 'working' | 'episodic' | 'semantic' | 'procedural';
/** Lifecycle state of a versioned record. */
type MemoryStatus = 'active' | 'superseded' | 'archived';
/** Input used to create or replace one record. */
interface RememberInput {
  readonly scope: string;
  readonly kind: MemoryKind;
  readonly memoryKey?: string;
  readonly value: string;
  readonly confidence?: number;
  readonly importance?: number;
  readonly sourceKind: string;
  readonly sourceRef?: string;
}
/** A durable retrieval observation for debugging and benchmark analysis. */
interface RetrievalTrace {
  readonly id: string;
  readonly scope: string;
  readonly query: string;
  readonly recordIds: readonly string[];
  readonly tokenEstimate: number;
  readonly createdAt: string;
}
/** Numeric plugin diagnostics suitable for dsh-benchup's custom metrics. */
interface MemCoreMetrics {
  memoryQueries: number;
  memoryHits: number;
  memoryMisses: number;
  recordsInjected: number;
  memoryTokens: number;
  recordsWritten: number;
  recordsSuperseded: number;
  recordsDeleted: number;
  repeatedFileReads: number;
  repeatedSearches: number;
  repeatedCommands: number;
  duplicateToolCalls: number;
}
/** Values supported in MemCore's persistent DSH settings section. */
interface MemCoreSettings {
  enabled: boolean;
}
/** Deployment configuration, supplied through the Cordis plugin entry. */
interface MemCoreConfig {
  enabled?: boolean;
  databasePath?: string;
  tokenBudget?: number;
  maxRecords?: number;
  capture?: {
    enabled?: boolean;
    minImportance?: number;
  };
}
//#endregion
//#region src/runtime.d.ts
/** Minimal structural Cordis face: this keeps MemCore independent of DSH's package versions. */
interface HarnessContext {
  on(event: string, listener: (...args: any[]) => unknown): () => void;
  inject(services: readonly string[], callback: (ctx: any) => unknown): unknown;
  effect?(effect: () => (() => void) | Promise<() => void>, name?: string): unknown;
  get?(name: string): unknown;
  [key: string]: unknown;
}
//#endregion
//#region src/config.d.ts
/** Namespace shared by the Host settings service and the Web toolbar button. */
declare const MEMCORE_SETTINGS_NAMESPACE = "memcore";
/** Persisted, live setting that turns retrieval and capture on or off. */
declare const MemCoreSettingsSchema: z<MemCoreSettings>;
//#endregion
//#region src/store.d.ts
/** Result of a version-aware memory write. */
interface RememberResult {
  readonly record: MemoryRecord;
  readonly written: boolean;
  readonly superseded: boolean;
}
/** Result of removing one active record from future retrieval. */
interface ForgetResult {
  readonly record: MemoryRecord | undefined;
  readonly deleted: boolean;
}
/** SQLite and FTS5-backed local store. It never contacts an external service. */
declare class MemoryStore {
  private readonly db;
  /** @param databasePath - location of this workspace's local SQLite file. */
  constructor(databasePath: string);
  /** Store a new record or create a superseding version for the same scoped key. */
  remember(input: RememberInput): RememberResult;
  /** Return one record, defaulting to the active version only. */
  get(id: string, includeHistory?: boolean): MemoryRecord | undefined;
  /** Archive one active record in its owning scope so it is never retrieved again. */
  forget(id: string, scope: string): ForgetResult;
  /** Search active records in a workspace and optional global namespace. */
  search(query: string, scopes: readonly string[], limit: number): RetrievedMemory[];
  /** Persist the local audit trail for one retrieval decision. */
  recordTrace(scope: string, query: string, recordIds: readonly string[], tokenEstimate: number): RetrievalTrace;
  /** Return simple stable counters for diagnostics and benchmarks. */
  counts(): {
    active: number;
    total: number;
    traces: number;
  };
  /** Close the database after the plugin's Cordis fiber is disposed. */
  close(): void;
  private activeByKey;
  private byId;
  private migrate;
}
//#endregion
//#region src/index.d.ts
/** Cordis loader identity. */
declare const name = "dsh-memcore";
/**
 * Install provider-neutral external memory into DSH.
 * @param ctx - DSH Cordis context.
 * @param config - optional plugin settings from the profile composition.
 */
declare function apply(ctx: HarnessContext, config?: MemCoreConfig): void;
//#endregion
export { type ForgetResult, MEMCORE_SETTINGS_NAMESPACE, type MemCoreConfig, type MemCoreMetrics, type MemCoreSettings, MemCoreSettingsSchema, type MemoryKind, type MemoryRecord, MemoryStore, type RememberInput, type RetrievedMemory, apply, name };