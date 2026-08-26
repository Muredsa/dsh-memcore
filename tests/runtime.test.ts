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

  it('captures a declared fact from a read result and retrieves it after a later question', async () => {
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
    const agent = { cwd: directory }

    listeners.get('agent/created')?.({ agent })
    listeners.get('agent/inbox/claimed')?.({ agent, message: { text: 'Read the provided record, then acknowledge it.' }, turn: 1 })
    listeners.get('tools/result')?.({ agent, name: 'read', arguments: { file_path: 'record.md' }, callId: 'read-record' }, {
      isError: false,
      meta: { lines: [
        { number: 1, text: 'key: suite.fact.aurora-marker' },
        { number: 2, text: 'memory: The migration marker for Nebula Lantern is AURORA-17-CRANE.' },
      ] },
    })
    listeners.get('agent/inbox/claimed')?.({ agent, message: { text: 'Read the question file and answer it.' }, turn: 1 })
    listeners.get('tools/result')?.({ agent, name: 'read', arguments: { file_path: 'question.md' }, callId: 'read-question' }, {
      isError: false,
      meta: { lines: [{ number: 1, text: 'What is the migration marker for Nebula Lantern?' }] },
    })

    const assembled = await listeners.get('system-prompt/assemble')?.({}, { scope: agent }, async () => ({ contexts: [] })) as { contexts: Array<{ name: string; text: string }> }
    expect(assembled.contexts).toContainEqual(expect.objectContaining({
      name: 'memcore:pack',
      text: expect.stringContaining('AURORA-17-CRANE'),
    }))
  })
})
