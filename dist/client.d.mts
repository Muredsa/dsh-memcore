import * as react0 from "react";

//#region src/client.d.ts
interface SettingsSnapshot {
  readonly status: 'loading' | 'ready' | 'unavailable';
  readonly writable: boolean;
  readonly value: {
    readonly enabled?: boolean;
  } | undefined;
}
interface SettingsScope {
  getSnapshot(): SettingsSnapshot;
  subscribe(listener: () => void): () => void;
  set(field: string, value: unknown): Promise<void>;
}
interface ToggleProps {
  readonly settings: SettingsScope;
  readonly locked?: boolean;
}
/** Web composer control for the persistent, live MemCore setting. */
declare function MemCoreToggle({
  settings,
  locked
}: ToggleProps): react0.JSX.Element;
/** Required Cordis client services. */
declare const inject: string[];
/** Register the compact MemCore control beside DSH's access-mode chip. */
declare function apply(ctx: any): void;
//#endregion
export { MemCoreToggle, apply, inject };