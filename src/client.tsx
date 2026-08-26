import { useState, useSyncExternalStore } from 'react'

const NAMESPACE = 'memcore'

interface SettingsSnapshot {
  readonly status: 'loading' | 'ready' | 'unavailable'
  readonly writable: boolean
  readonly value: { readonly enabled?: boolean } | undefined
}

interface SettingsScope {
  getSnapshot(): SettingsSnapshot
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
}

interface ToggleProps {
  readonly settings: SettingsScope
  readonly locked?: boolean
}

/** Web composer control for the persistent, live MemCore setting. */
export function MemCoreToggle({ settings, locked = false }: ToggleProps) {
  const snapshot = useSyncExternalStore(
    listener => settings.subscribe(listener),
    () => settings.getSnapshot(),
  )
  const [saving, setSaving] = useState(false)
  const enabled = snapshot.value?.enabled ?? false
  const available = snapshot.status === 'ready' && snapshot.writable && !locked
  const label = enabled ? 'MemCore: on' : 'MemCore: off'
  const title = enabled
    ? 'MemCore is enabled. Click to pause memory retrieval and capture.'
    : 'MemCore is paused. Click to resume memory retrieval and capture.'

  return (
    <button
      type="button"
      aria-pressed={enabled}
      title={title}
      disabled={!available || saving}
      onClick={() => {
        setSaving(true)
        void settings.set('enabled', !enabled).finally(() => { setSaving(false) })
      }}
      style={{
        height: 28,
        padding: '0 8px',
        border: 'none',
        borderRadius: 8,
        background: enabled ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
        color: enabled ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
        fontFamily: 'var(--dsw-font-family)',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: '20px',
        whiteSpace: 'nowrap',
        cursor: available && !saving ? 'pointer' : 'default',
        opacity: available ? 1 : 0.5,
      }}
    >
      {saving ? 'MemCore…' : label}
    </button>
  )
}

/** Required Cordis client services. */
export const inject = ['slots', 'settingsScope']

/** Register the compact MemCore control beside DSH's access-mode chip. */
export function apply(ctx: any): void {
  const settings = ctx.settingsScope.bind({
    namespace: NAMESPACE,
    decode(value: unknown) {
      if (typeof value !== 'object' || value === null || typeof (value as { enabled?: unknown }).enabled !== 'boolean') return undefined
      return value as { enabled: boolean }
    },
  }) as SettingsScope
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'memcore-toggle',
    order: 50,
    inject: () => ({ settings }),
  }, MemCoreToggle))
}
