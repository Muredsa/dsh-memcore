window.__ModuleLoader__.load({ id: "dsh-memcore", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region src/client.tsx
const NAMESPACE = "memcore";
/** Web composer control for the persistent, live MemCore setting. */
function MemCoreToggle({ settings, locked = false }) {
	const snapshot = (0, react.useSyncExternalStore)((listener) => settings.subscribe(listener), () => settings.getSnapshot());
	const [saving, setSaving] = (0, react.useState)(false);
	const enabled = snapshot.value?.enabled ?? false;
	const available = snapshot.status === "ready" && snapshot.writable && !locked;
	const label = enabled ? "MemCore: on" : "MemCore: off";
	const title = enabled ? "MemCore is enabled. Click to pause memory retrieval and capture." : "MemCore is paused. Click to resume memory retrieval and capture.";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-pressed": enabled,
		title,
		disabled: !available || saving,
		onClick: () => {
			setSaving(true);
			settings.set("enabled", !enabled).finally(() => {
				setSaving(false);
			});
		},
		style: {
			height: 28,
			padding: "0 8px",
			border: "none",
			borderRadius: 8,
			background: enabled ? "var(--dsw-alias-interactive-bg-hover)" : "transparent",
			color: enabled ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
			fontFamily: "var(--dsw-font-family)",
			fontSize: 13,
			fontWeight: 500,
			lineHeight: "20px",
			whiteSpace: "nowrap",
			cursor: available && !saving ? "pointer" : "default",
			opacity: available ? 1 : .5
		},
		children: saving ? "MemCore…" : label
	});
}
/** Required Cordis client services. */
const inject = ["slots", "settingsScope"];
/** Register the compact MemCore control beside DSH's access-mode chip. */
function apply(ctx) {
	const settings = ctx.settingsScope.bind({
		namespace: NAMESPACE,
		decode(value) {
			if (typeof value !== "object" || value === null || typeof value.enabled !== "boolean") return void 0;
			return value;
		}
	});
	ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
		name: "conversation.input.left",
		id: "memcore-toggle",
		order: 50,
		inject: () => ({ settings })
	}, MemCoreToggle));
}

//#endregion
exports.MemCoreToggle = MemCoreToggle;
exports.apply = apply;
exports.inject = inject;
return module.exports; } });