import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryStore } from '../src/store.ts'

const paths: string[] = []
const stores: MemoryStore[] = []

function createStore(): MemoryStore {
  const directory = mkdtempSync(join(tmpdir(), 'dsh-memcore-'))
  paths.push(directory)
  const store = new MemoryStore(join(directory, 'memcore.sqlite'))
  stores.push(store)
  return store
}

afterEach(() => {
  while (stores.length > 0) stores.pop()!.close()
  while (paths.length > 0) rmSync(paths.pop()!, { recursive: true, force: true })
})

describe('MemoryStore', () => {
  it('supersedes a keyed value without losing its history', () => {
    const store = createStore()
    const first = store.remember({
      scope: 'workspace:demo', kind: 'semantic', memoryKey: 'production-url',
      value: 'Production URL is https://old.example.test', sourceKind: 'tool',
    })
    const second = store.remember({
      scope: 'workspace:demo', kind: 'semantic', memoryKey: 'production-url',
      value: 'Production URL is https://new.example.test', sourceKind: 'tool',
    })

    expect(second.superseded).toBe(true)
    expect(store.get(first.record.id)).toBeUndefined()
    expect(store.get(first.record.id, true)?.status).toBe('superseded')
    expect(store.get(second.record.id)?.value).toContain('new.example.test')
  })

  it('retrieves active records only from requested scopes', () => {
    const store = createStore()
    store.remember({ scope: 'workspace:one', kind: 'semantic', value: 'Authentication uses refresh tokens.', sourceKind: 'tool' })
    store.remember({ scope: 'workspace:two', kind: 'semantic', value: 'Authentication uses an unrelated identity service.', sourceKind: 'tool' })

    const records = store.search('How does authentication use refresh tokens?', ['workspace:one'], 8)
    expect(records).toHaveLength(1)
    expect(records[0]?.scope).toBe('workspace:one')
  })

  it('forgets only the active record in its owning scope', () => {
    const store = createStore()
    const record = store.remember({
      scope: 'workspace:one', kind: 'semantic', value: 'The deprecated deployment is no longer used.', sourceKind: 'tool',
    }).record

    expect(store.forget(record.id, 'workspace:two')).toEqual({ record: undefined, deleted: false })

    const forgotten = store.forget(record.id, 'workspace:one')
    expect(forgotten.deleted).toBe(true)
    expect(forgotten.record?.status).toBe('archived')
    expect(store.get(record.id)).toBeUndefined()
    expect(store.get(record.id, true)?.validUntil).toBeTruthy()
    expect(store.search('deprecated deployment', ['workspace:one'], 8)).toEqual([])
  })
})
