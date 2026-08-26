# dsh-memcore

Provider-neutral external memory for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It works above the LLM-provider layer, so the same plugin can assist OpenAI/Codex, DeepSeek, Claude, OpenRouter, and local models.

MemCore is local-first: each workspace gets a SQLite + FTS5 database. It does not require Docker, PostgreSQL, Qdrant, an embedding API, or a particular model provider.

## Install from Git

This repository includes its built `dist/` files, so installation does not need an npm publication.

```powershell
dsh plugin --profile web add github:Muredsa/dsh-memcore
```

For a non-Web profile, use its name instead:

```powershell
dsh plugin --profile headless add github:Muredsa/dsh-memcore
```

Restart the profile after installation. The bundle patch enables MemCore by default.

In the Web interface, the `MemCore: on` button appears in the composer tool row beside the access mode (`Read Only`, `Full Access`, and so on). Turning it off immediately pauses automatic retrieval, automatic capture, and memory tools. It preserves the local database; turning it back on resumes it.

## What the MVP does

- Retrieves lexical FTS5 matches before a model request and injects a budgeted `MEMCORE REFERENCE` context.
- Keeps records scoped to a workspace; a record from one repository is never searched in another.
- Stores explicit facts, decisions, events, and procedures through model-visible `memcore_remember`.
- Versions keyed facts: save a replacement using the same `key`, and the old record is marked superseded instead of deleted.
- Rejects likely credentials and private keys from automatic and explicit capture.
- Supplies `memcore_search`, `memcore_get`, and `memcore_stats` tools.
- Records local retrieval traces in SQLite and reports custom counters to `dsh-benchup` when it is loaded.
- Counts duplicate tool calls, repeated file reads, searches, and commands for memory-efficiency benchmarks.

Automatic capture is intentionally conservative. It recognizes explicit memory/decision language; it does not blindly store tool output, website text, or every conversation message as trusted memory.

## Configuration

The default database is `.dsh/memcore.sqlite` under the profile's current workspace. The benchmark runner can isolate a run by setting `DSH_BENCHUP_STATE_ROOT`; MemCore uses that directory as the database root.

```yaml
- id: memcore
  name: dsh-memcore
  config:
    enabled: true
    databasePath: .dsh/memcore.sqlite
    tokenBudget: 1200
    maxRecords: 8
    capture:
      enabled: true
      minImportance: 0.72
```

`enabled` is also a live setting controlled by the Web button. The other options are profile configuration and take effect after restarting the profile.

## Updating from Git

Pin a known revision for reproducible experiments:

```powershell
dsh plugin --profile web add github:Muredsa/dsh-memcore#v0.1.4
```

To move to a newer release, repeat the command with its tag, then restart the profile. For development, clone this repository, run `pnpm install`, `pnpm test`, and `pnpm build`; commit `dist/` with a release so Git-based users receive the runnable plugin.

## Current boundary

This first version uses SQLite FTS5 and metadata/recency ranking. Embeddings, a record-inspection panel, subagent-specific memory packs, encrypted secret storage, and deterministic value injection into arbitrary tool arguments are deliberately deferred. `memcore_get` is the safe model-agnostic exact-value mechanism for non-secret values.
