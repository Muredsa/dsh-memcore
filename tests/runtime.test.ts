import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { MemCoreRuntime, type HarnessContext } from '../src/runtime.ts'

const paths: string[] = []
const disposers: Array<() => void> = []

afterEach(() => {
  while (disposers.length > 0) disposers.pop()!()
  while (paths.length > 0) rmSync(paths.pop()!, { recursive: true, force: true })
})

describe('MemCoreRuntime', () => {
  it('attaches to a BenchUp service loaded after MemCore', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dsh-memcore-runtime-'))
    paths.push(directory)
    const listeners = new Map<string, (...args: unknown[]) => unknown>()
    const context: HarnessContext = {
      on(event, listener) {
        listeners.set(event, listener)
        return () => { listeners.delete(event) }
      },
      inject(services, callback) {
        if (services.includes('settings')) callback({ ...context, settings: { register: () => ({ get: () => ({ enabled: true }), watch: () => () => {} }) } })
        if (services.includes('tools')) callback({ ...context, tools: { register: () => () => {} } })
      },
      effect(effect) { disposers.push(effect() as () => void) },
      get: () => undefined,
    }
    new MemCoreRuntime(context, { databasePath: join(directory, 'memcore.sqlite') })
    const definitions: Array<{ name: string }> = []

    listeners.get('internal/service')?.('benchMetrics', {
      add: () => {},
      register: (definition: { name: string }) => { definitions.push(definition) },
    })

    expect(definitions).toHaveLength(12)
    expect(definitions.map((definition) => definition.name)).toContain('memcore.memory_hits')
    expect(definitions.map((definition) => definition.name)).toContain('memcore.records_deleted')
  })
})
