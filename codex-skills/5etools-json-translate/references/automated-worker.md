# Automated homebrew worker

Use this reference only when a scheduler or worker supplies a queue lease.

The queue coordinator is `scripts/homebrew_translation_queue.py`. Its SQLite database defaults to `/data/homebrew-translation-state/queue.sqlite3`; override it with `--database` for testing or a separate deployment. The English root, Chinese repository, state directory, and worktree root can be overridden with `HOMEBREW_EN_ROOT`, `HOMEBREW_ZH_REPO`, `HOMEBREW_TRANSLATION_STATE_DIR`, and `HOMEBREW_WORKTREE_ROOT`.

## Lease contract

Claim exactly one file:

```bash
python3 <skill-dir>/scripts/homebrew_translation_queue.py claim \
  --worker-id "$WORKER_ID"
```

Exit code `3` with `EMPTY_QUEUE` is a successful no-work outcome. A successful claim returns `lease_id`, the absolute English `source`, its hash, and an isolated `target_root`/`worktree`. Export:

```bash
export HOMEBREW_EN_ROOT=/data/homebrew-en
export HOMEBREW_ZH_ROOT=<target_root-from-claim>
```

Immediately start a detached keepalive sidecar for the lease. Use a 5-minute interval with the default 30-minute renewal window. Record its PID and log, and stop it after `complete` or `fail`; the sidecar also exits when the task leaves `leased` state. The claim carries a default 12-hour hard lifetime so an orphaned sidecar cannot retain a task indefinitely.

```bash
python3 <skill-dir>/scripts/homebrew_translation_queue.py keepalive \
  --lease-id "$LEASE_ID" --interval-seconds 300 --lease-minutes 30
```

Run that command under the scheduler's process supervisor or as a detached child. Do not rely only on heartbeats before and after model calls.

Translate only the claimed source. Never claim a second task in the same run. Renew the lease before and after translator, review, build, or test operations that may take several minutes:

By default, claiming is refused while the shared Chinese repository has non-generated uncommitted changes. Commit or otherwise resolve that work first. Do not use `--allow-dirty-base` in scheduled production runs; it exists only for deliberately isolated testing.

```bash
python3 <skill-dir>/scripts/homebrew_translation_queue.py heartbeat \
  --lease-id "$LEASE_ID"
```

If work cannot finish, call `fail` with a concise actionable reason. Use `--blocked` for identity collisions, ambiguous filenames, or other conditions that require human judgment; ordinary transient failures remain retryable.

If a completed worktree survives an expired lease and `reclaim-expired` has not taken ownership, the same worker identity may recover it with `resume-lease`. The command atomically checks the worker identity, source hash, worktree branch, and claimed-base ancestry. Never edit the database or revive a lease after it has been reclaimed.

Files too large for one bounded worker invocation should be put into coordinator-managed chunk mode as described in [chunked-worker.md](chunked-worker.md). Do not physically split the source JSON and do not mark size alone as a permanent block.

## Commit and completion

The isolated worktree may contain generated index changes after build. Stage and commit only the selected translated JSON path or its intentional rename; do not commit `_generated` files. Create a result JSON containing:

```json
{
  "source_hash": "<hash from claim>",
  "target": "relative/path/to/<作者>; <中文资源名>.json",
  "commit_sha": "<worktree HEAD>",
  "analyser": {"jobs": 0, "actionable": 0, "residual": 0, "unresolved_paths": 0},
  "review": {"rounds": 1, "result": "PASS"},
  "validation": {
    "json": "PASS",
    "structure": "PASS",
    "schema": "PASS",
    "build": "PASS",
    "tests": "PASS"
  }
}
```

Use actual counts and results. Then register the work:

```bash
python3 <skill-dir>/scripts/homebrew_translation_queue.py complete \
  --lease-id "$LEASE_ID" --result /path/to/result.json
```

Completion rejects expired/replaced leases, changed sources, missing targets, commits outside the selected category, and incomplete validation. It marks the task `ready`; it does not alter the shared Chinese repository. A separate serial integration process runs `integrate-next` only when the shared repository has no non-generated uncommitted changes; generated index changes are ignored and preserved.

Both worker preflight and serial integration require a fully clean repository-test baseline. Never pass `--allow-failing-baseline` in automation; that flag is reserved for explicit human diagnosis and must not be used to admit a task into `ready` or `merged`.

## Priority control

`claim` orders eligible tasks by `priority DESC, attempts ASC, source_path ASC`. After claiming a file, the coordinator checks its `_meta.dependencies` Source codes against the English `_generated/index-sources.json`. It raises queued dependency files missing from the Chinese source index above other claimable work, so later claims pick them first. The current worker still translates only its own claimed file.

To raise one file above the rest of the queue manually, run:

```bash
python3 <skill-dir>/scripts/homebrew_translation_queue.py set-priority \
  --source "collection/<作者>; <资源名>.json"
```

`--source` accepts the exact relative path, a unique path suffix, or a unique substring; an ambiguous or unknown match is rejected with the candidate list. Without a mode flag the command raises the task above every currently claimable (`pending`/`failed`) task, and when that task is waiting out a `failed` retry timer it also clears `retry_after` so the very next claim can take it. `--to N` sets an absolute value, `--raise-by N` adjusts relatively (negative lowers), and `--reset` restores the default `0`. Finished (`merged`/`obsolete`) tasks are refused. Every change records a `priority_changed` event, and priorities survive `sync` re-queues, retries, and source changes.

## Scheduler cycle

A scheduler should run `sync`, then `reclaim-expired`, then start the configured number of workers. It may start workers concurrently because claims are atomic and each claim receives a separate Git worktree. Run one serial integration process for `ready` tasks. `integrate-next` refuses to operate when the shared Chinese repository has any uncommitted changes.

For scheduler control flow, `integrate-next` exits `0` after a merge, `3` when no eligible task exists, and `4` when a transient integration or validation failure has safely returned the task to `ready`. A serial scheduler may continue to the next task after exit `4`; exit `2` indicates a blocked, ownership, input, or system error which should stop the current integration cycle.

After an integration succeeds (including recovery of an integration already present in shared history), `integrate-next` automatically removes orphaned `auto-translate/*` and `auto-integrate/*` worktrees under the configured worker root. It preserves every worktree referenced by an active queue task, chunk-parent worktrees, worktrees outside that root, and non-automation branches. Cleanup results are returned in `worktree_cleanup`; cleanup failures are reported without undoing the successful integration.

If `npm run build` normalizes only the selected target JSON during serial integration, the coordinator amends that normalization into the candidate commit and then subjects the resulting file to the structure, schema, and full repository-test gates. Any build change to another non-generated file remains a hard integration failure. The merge result reports whether normalization was absorbed in `build_target_absorbed`.

By default `sync` routes source files larger than 250,000 bytes to `needs_chunking`, so ordinary workers cannot accidentally lease them. The scheduler should create their parent plans with `homebrew_translation_chunks.py plan`. Override `--chunk-threshold-bytes` only as an explicit deployment choice; use `0` to disable automatic routing.
