---
name: homebrew-translation-worker
description: Plan one oversized homebrew JSON or claim and translate one queued file or chunk, then register a validated commit for serial integration. Use for scheduled or concurrent automatic homebrew translation workers.
---

# Homebrew Translation Worker

Act as one queue worker. Do not choose a file manually. In one invocation, either finalize one completed chunked parent, plan one large file and complete its initial terminology inventory, translate one chunk, or translate one ordinary file.

Locate the installed `5etools-json-translate` skill and read its `SKILL.md`, `references/automated-worker.md`, and `references/chunked-worker.md`. Use one stable run ID and the same queue database and source/target/worktree roots for every command in this invocation. The scheduler has already run queue `sync`; do not run it concurrently with other workers.

Before dispatch, run `homebrew_translation_chunks.py reclaim-expired` to release expired chunk leases, including legacy leases created before isolated chunk worktrees. Before an ordinary claim, run `scripts/homebrew_translation_queue.py status --all` and inspect the full task list. Within this invocation, skip any child that returned `waiting_dependencies` when dispatching again; its parent must progress first. Dispatch in this order:

1. Inspect `chunked` tasks in priority-descending, `source_path`-ascending order. For each, run `homebrew_translation_chunks.py status --source-path '<exact source_path>'`. If any parent is not `terminology_ready`, reserve and complete its initial inventory before finalization or chunk claims, even if its chunks are already complete. Use `start-inventory --worker-id <stable-run-id>`; if another worker owns the unexpired reservation or any chunk lease is still active, stop. The owner extracts entities from every chunk with read-only subagents, adjudicates all proposals in the main worker, records decisions and evidence to the persistent glossary file using `set-term --worker-id <stable-run-id>`, and calls `lock-glossary --worker-id <stable-run-id>`. Release the reservation if the inventory cannot be completed. After locking the initial inventory, stop this invocation so no translation starts before the whole glossary is available. If chunk proposals are pending later, reserve the glossary again, wait until active chunk leases drain, resolve proposals using `set-term`/`allow-collision` with the reservation's worker ID, and call `lock-glossary` before claiming more chunks. Next select the highest-priority parent whose chunks are all `complete` and terminology is ready, and run finalization. Otherwise select the first parent with a `pending`, `failed`, or `stale` chunk and claim it even if another chunk in that parent is leased; each lease has an isolated worktree. Do not claim an ordinary file after a successful chunk lease. If every remaining chunk is already leased, stop this invocation; never fall through to new work.

If status shows an expired `glossary_owner` reservation with no pending proposals, reacquire it with `start-inventory` and call `lock-glossary` to clear the stale reservation. Do not claim chunks while the reservation field is set.
2. Only when no planned parent has unfinished chunks may a worker plan a `needs_chunking` task. Run `scripts/homebrew_translation_chunks.py plan --source-path '<exact source_path>' --max-chunk-chars 80000`, then reserve and complete its initial terminology inventory in the same invocation. If reservation returns `waiting_glossary`, or planning returns `waiting_dependencies` or `waiting_chunked_parent`, stop. After a successful plan, refresh queue status and set the parent priority to one greater than the highest priority. Stop after the initial inventory; subsequent workers claim chunks. If another worker planned it first, refresh status and dispatch again; do not create a second plan.
3. Only when no planned parent has unfinished chunks may the worker claim an ordinary file. If `claim` returns `waiting_chunked`, report the blocked sources and stop. If it returns `waiting_dependencies`, report the waiting children and stop. If it returns `EMPTY_QUEUE`, report that outcome and stop successfully.

## Chunk parent finalization dispatch

A parent is eligible only when `status` reports at least one chunk and all chunks are `complete`; a missing `chunks` count is not proof of completion. Once selected, do not lease a chunk or ordinary task in the same invocation. Follow the final terminology and integration gate in `references/chunked-worker.md`: run `audit-terminology`, conduct and record the global independent terminology review across every chunk context packet, run the full-file analyser to zero residual and unresolved paths, and pass JSON, structure, schema, build, and test validation. Include `global_terminology_review: {"result":"PASS","chunks_reviewed":[...]}` listing every exact chunk ID. Write the source hash and actual validation values, then run `finalize --source-path '<exact source_path>' --result <report>`. Confirm it returns `ready`; serial integration remains the `integrate-next` process's responsibility. If audit or validation fails, report the blocker and preserve the parent worktree for repair; do not claim another task in that invocation.

The coordinators check `_meta.dependencies` before leasing or planning a child file. If a referenced parent is queued and has not reached `merged`, they raise its priority and leave the child unclaimed. A `ready` parent still needs serial integration before its child can be claimed. Any unfinished planned chunk parent blocks new plans and ordinary file claims, while already planned chunked parents may continue processing concurrently.

If the scheduler already supplies a chunk lease, follow `references/chunked-worker.md` directly. Never turn a normal lease into ad-hoc chunks inside a worker.

For a successful lease:

1. Export `HOMEBREW_EN_ROOT` from the claim's source root and `HOMEBREW_ZH_ROOT` as the returned isolated target root. For chunk leases, use the chunk-specific worktree and read its returned glossary file.
2. Start the queue coordinator's `keepalive` sidecar immediately after a successful claim. Keep its PID and log outside the worktree, and stop it after `complete` or `fail`. Stage-boundary heartbeats remain useful checks but are not a substitute for the sidecar.
3. Use `$5etools-json-translate` in homebrew mode on the exact returned source path. The analyser establishes translation scope, but every candidate translation still requires contextual verification.
4. Renew the lease around long translator, independent-review, build, and test stages.
5. Stage and commit only the selected translated JSON or its intentional rename. Never commit `_generated` output.
6. Write the required structured result and call `complete`. A successful worker ends in queue state `ready`, not `merged`.

On any incomplete ordinary lease, call `fail` before exiting; on an incomplete chunk lease, call `fail-chunk`. Mark a task blocked only when retrying cannot resolve the condition without human judgment. File size alone is not a blocked condition. Never run `integrate-next`; integration is a separate serial responsibility.
