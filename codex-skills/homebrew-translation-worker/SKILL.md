---
name: homebrew-translation-worker
description: Plan one oversized homebrew JSON or claim and translate one queued file or chunk, then register a validated commit for serial integration. Use for scheduled or concurrent automatic homebrew translation workers.
---

# Homebrew Translation Worker

Act as one queue worker. Do not choose a file manually. In one invocation, either finalize one completed chunked parent, plan one large file, translate one chunk, or translate one ordinary file.

Locate the installed `5etools-json-translate` skill and read its `SKILL.md`, `references/automated-worker.md`, and `references/chunked-worker.md`. Use one stable run ID and the same queue database and source/target/worktree roots for every command in this invocation. The scheduler has already run queue `sync`; do not run it concurrently with other workers.

Before an ordinary claim, run `scripts/homebrew_translation_queue.py status --all` and inspect the full task list. Within this invocation, skip any child that returned `waiting_dependencies` when dispatching again; its parent must progress first. Dispatch in this order:

1. Inspect `chunked` tasks in priority-descending, `source_path`-ascending order. For each, run `homebrew_translation_chunks.py status --source-path '<exact source_path>'`. First select the highest-priority parent whose status shows at least one chunk and every chunk `complete` (no `pending`, `failed`, `stale`, or `leased` chunks), and run the finalization workflow below. This branch takes precedence over claiming more chunks, so completed parents cannot be starved by higher-priority translation work. If multiple parents are ready, break ties by `source_path` ascending. If no parent is ready to finalize, select the first parent with a `pending`, `failed`, or `stale` chunk and no `leased` chunk. Run `claim-chunk --source-path '<exact source_path>' --worker-id <stable-run-id>`. If it returns `waiting_dependencies`, the coordinator has raised its untranslated parent files; skip this child and dispatch again. Otherwise follow `references/chunked-worker.md` for the returned lease, including keepalive, scoped translation, review, completion or failure. Do not claim an ordinary file after a successful chunk lease. If a concurrent worker took the chunk first, refresh status and dispatch again.
2. Otherwise, for a task in `needs_chunking`, choose the highest-priority task (tie: `source_path` ascending). Run `scripts/homebrew_translation_chunks.py plan --source-path '<exact source_path>' --max-chunk-chars 80000`. If it returns `waiting_dependencies`, skip this child and dispatch again; do not plan it yet. After a successful plan, refresh `homebrew_translation_queue.py status --all`, then run `set-priority --source '<exact source_path>' --to N`, where `N` is one greater than the largest priority in that refreshed full status result. This raises the parent above ordinary tasks; the chunk coordinator itself has no per-chunk priority field. Report the planned source and chunk count, then stop. The next worker invocation claims a chunk. If another worker planned it first, refresh status and dispatch again; do not create a second plan.
3. Otherwise run `homebrew_translation_queue.py claim --worker-id <stable-run-id>`. If it returns `waiting_dependencies`, report the waiting children and stop; their parents need translation or serial integration. If it returns `EMPTY_QUEUE`, report that outcome and stop successfully.

## Chunk parent finalization dispatch

A parent is eligible only when `status` reports at least one chunk and all chunks are `complete`; a missing `chunks` count is not proof of completion. Once selected, do not lease a chunk or ordinary task in the same invocation. Follow the final terminology and integration gate in `references/chunked-worker.md` to completion: run `audit-terminology`, conduct and record the global independent terminology review across chunk context packets, run the full-file analyser to zero residual and unresolved paths, and pass JSON, structure, schema, build, and test validation. Write the normal worker result report with `terminology: {"result":"PASS"}`, source hash and actual validation values, then run `finalize --source-path '<exact source_path>' --result <report>`. Confirm it returns `ready`; serial integration remains the `integrate-next` process's responsibility. If audit or validation fails, report the blocker and preserve the parent worktree for repair; do not claim another task in that invocation.

The coordinators check `_meta.dependencies` before leasing or planning a child file. If a referenced parent is queued and has not reached `merged`, they raise its priority and leave the child unclaimed. A `ready` parent still needs serial integration before its child can be claimed.

If the scheduler already supplies a chunk lease, follow `references/chunked-worker.md` directly. Never turn a normal lease into ad-hoc chunks inside a worker.

For a successful lease:

1. Export `HOMEBREW_EN_ROOT` from the claim's source root and `HOMEBREW_ZH_ROOT` as the returned isolated target root.
2. Start the queue coordinator's `keepalive` sidecar immediately after a successful claim. Keep its PID and log outside the worktree, and stop it after `complete` or `fail`. Stage-boundary heartbeats remain useful checks but are not a substitute for the sidecar.
3. Use `$5etools-json-translate` in homebrew mode on the exact returned source path. The analyser establishes translation scope, but every candidate translation still requires contextual verification.
4. Renew the lease around long translator, independent-review, build, and test stages.
5. Stage and commit only the selected translated JSON or its intentional rename. Never commit `_generated` output.
6. Write the required structured result and call `complete`. A successful worker ends in queue state `ready`, not `merged`.

On any incomplete ordinary lease, call `fail` before exiting; on an incomplete chunk lease, call `fail-chunk`. Mark a task blocked only when retrying cannot resolve the condition without human judgment. File size alone is not a blocked condition. Never run `integrate-next`; integration is a separate serial responsibility.
