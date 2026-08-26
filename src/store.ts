import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { lexicalTerms } from './text.ts'
import type {
  MemoryKind, MemoryRecord, MemoryStatus, RememberInput, RetrievedMemory, RetrievalTrace,
} from './types.ts'

interface MemoryRow {
  id: string
  scope: string
  kind: MemoryKind
  record_key: string | null
  value: string
  confidence: number
  importance: number
  source_kind: string
  source_ref: string | null
  created_at: string
  updated_at: string
  valid_from: string
  valid_until: string | null
  supersedes: string | null
  superseded_by: string | null
  status: MemoryStatus
  rank?: number
}

/** Result of a version-aware memory write. */
export interface RememberResult {
  readonly record: MemoryRecord
  readonly written: boolean
  readonly superseded: boolean
}

/** SQLite and FTS5-backed local store. It never contacts an external service. */
export class MemoryStore {
  private readonly db: DatabaseSync

  /** @param databasePath - location of this workspace's local SQLite file. */
  constructor(databasePath: string) {
    const target = resolve(databasePath)
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(target)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    this.migrate()
  }

  /** Store a new record or create a superseding version for the same scoped key. */
  remember(input: RememberInput): RememberResult {
    const now = new Date().toISOString()
    const key = input.memoryKey ?? null
    const current = key === null ? undefined : this.activeByKey(input.scope, key)
    if (current !== undefined && current.value === input.value && current.kind === input.kind) {
      return { record: toRecord(current), written: false, superseded: false }
    }

    const id = randomUUID()
    this.db.exec('BEGIN IMMEDIATE')
    try {
      this.db.prepare(`
        INSERT INTO memory_records (
          id, scope, kind, record_key, value, confidence, importance, source_kind, source_ref,
          created_at, updated_at, valid_from, supersedes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, input.scope, input.kind, key, input.value,
        input.confidence ?? 0.8, input.importance ?? 0.75,
        input.sourceKind, input.sourceRef ?? null,
        now, now, now, current?.id ?? null, current === undefined ? 'active' : 'archived',
      )
      if (current !== undefined) {
        this.db.prepare(
          "UPDATE memory_records SET status = 'superseded', superseded_by = ?, valid_until = ?, updated_at = ? WHERE id = ?",
        ).run(id, now, now, current.id)
        this.db.prepare("UPDATE memory_records SET status = 'active' WHERE id = ?").run(id)
      }
      this.db.prepare('INSERT INTO memory_fts (id, text) VALUES (?, ?)').run(id, input.value)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
    const created = this.byId(id)
    if (created === undefined) throw new Error(`memcore store lost record ${id}`)
    return { record: toRecord(created), written: true, superseded: current !== undefined }
  }

  /** Return one record, defaulting to the active version only. */
  get(id: string, includeHistory = false): MemoryRecord | undefined {
    const row = this.db.prepare(
      includeHistory ? 'SELECT * FROM memory_records WHERE id = ?' : "SELECT * FROM memory_records WHERE id = ? AND status = 'active'",
    ).get(id) as MemoryRow | undefined
    return row === undefined ? undefined : toRecord(row)
  }

  /** Search active records in a workspace and optional global namespace. */
  search(query: string, scopes: readonly string[], limit: number): RetrievedMemory[] {
    const terms = lexicalTerms(query)
    if (terms.length === 0 || scopes.length === 0) return []
    const scopeSlots = scopes.map(() => '?').join(', ')
    const match = terms.map(term => `"${term.replaceAll('"', '')}"`).join(' OR ')
    let rows: MemoryRow[] = []
    try {
      rows = this.db.prepare(`
        SELECT memory_records.*, bm25(memory_fts) AS rank
        FROM memory_fts
        JOIN memory_records ON memory_records.id = memory_fts.id
        WHERE memory_fts MATCH ?
          AND memory_records.status = 'active'
          AND memory_records.scope IN (${scopeSlots})
        ORDER BY rank
        LIMIT ?
      `).all(match, ...scopes, limit) as unknown as MemoryRow[]
    } catch {
      // Some SQLite builds can reject a token that escaped the FTS grammar.
      // The fallback stays parameterized and remains local to the same scopes.
      const clauses = terms.map(() => 'memory_records.value LIKE ?').join(' OR ')
      rows = this.db.prepare(`
        SELECT memory_records.*
        FROM memory_records
        WHERE memory_records.status = 'active'
          AND memory_records.scope IN (${scopeSlots})
          AND (${clauses})
        ORDER BY memory_records.importance DESC, memory_records.updated_at DESC
        LIMIT ?
      `).all(...scopes, ...terms.map(term => `%${term}%`), limit) as unknown as MemoryRow[]
    }
    const now = Date.now()
    return rows.map(row => ({
      ...toRecord(row),
      score: score(row, now),
    })).sort((left, right) => right.score - left.score)
  }

  /** Persist the local audit trail for one retrieval decision. */
  recordTrace(scope: string, query: string, recordIds: readonly string[], tokenEstimate: number): RetrievalTrace {
    const trace: RetrievalTrace = {
      id: randomUUID(),
      scope,
      query,
      recordIds: [...recordIds],
      tokenEstimate,
      createdAt: new Date().toISOString(),
    }
    this.db.prepare(`
      INSERT INTO memory_traces (id, scope, query, record_ids, token_estimate, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(trace.id, trace.scope, trace.query, JSON.stringify(trace.recordIds), trace.tokenEstimate, trace.createdAt)
    return trace
  }

  /** Return simple stable counters for diagnostics and benchmarks. */
  counts(): { active: number; total: number; traces: number } {
    const records = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        COUNT(*) AS total
      FROM memory_records
    `).get() as { active: number | null; total: number }
    const traces = this.db.prepare('SELECT COUNT(*) AS count FROM memory_traces').get() as { count: number }
    return { active: records.active ?? 0, total: records.total, traces: traces.count }
  }

  /** Close the database after the plugin's Cordis fiber is disposed. */
  close(): void {
    this.db.close()
  }

  private activeByKey(scope: string, key: string): MemoryRow | undefined {
    return this.db.prepare(`
      SELECT * FROM memory_records
      WHERE scope = ? AND record_key = ? AND status = 'active'
      LIMIT 1
    `).get(scope, key) as MemoryRow | undefined
  }

  private byId(id: string): MemoryRow | undefined {
    return this.db.prepare('SELECT * FROM memory_records WHERE id = ?').get(id) as MemoryRow | undefined
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_records (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('working', 'episodic', 'semantic', 'procedural')),
        record_key TEXT,
        value TEXT NOT NULL,
        confidence REAL NOT NULL,
        importance REAL NOT NULL,
        source_kind TEXT NOT NULL,
        source_ref TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_until TEXT,
        supersedes TEXT REFERENCES memory_records(id),
        superseded_by TEXT REFERENCES memory_records(id),
        status TEXT NOT NULL CHECK(status IN ('active', 'superseded', 'archived'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS memory_active_key
        ON memory_records(scope, record_key) WHERE record_key IS NOT NULL AND status = 'active';
      CREATE INDEX IF NOT EXISTS memory_scope_status_updated
        ON memory_records(scope, status, updated_at DESC);
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, text, tokenize = 'unicode61');
      CREATE TABLE IF NOT EXISTS memory_traces (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        query TEXT NOT NULL,
        record_ids TEXT NOT NULL,
        token_estimate INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `)
  }
}

/** Convert SQLite naming to the package's public field names. */
function toRecord(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    scope: row.scope,
    kind: row.kind,
    memoryKey: row.record_key,
    value: row.value,
    confidence: row.confidence,
    importance: row.importance,
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    supersedes: row.supersedes,
    supersededBy: row.superseded_by,
    status: row.status,
  }
}

/** Combine lexical relevance with record importance, confidence, and recency. */
function score(row: MemoryRow, now: number): number {
  const ageDays = Math.max(0, (now - Date.parse(row.updated_at)) / 86_400_000)
  const recency = Math.max(0, 1 - ageDays / 180)
  const lexical = Math.max(0, -(row.rank ?? 0))
  return lexical + row.importance * 0.5 + row.confidence * 0.25 + recency * 0.1
}
