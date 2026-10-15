---
name: homebrew-translation-worker
description: Claim exactly one queued homebrew JSON translation, process it in an isolated Git worktree with the 5etools-json-translate workflow, and register a validated commit for serial integration. Use for scheduled or concurrent automatic homebrew translation workers.
---

# Homebrew Translation Worker

Act as one queue worker. Do not choose a file manually and do not process more than one file per invocation.

Locate the installed `5etools-json-translate` skill and read its `SKILL.md` plus `references/automated-worker.md`. Run its `scripts/homebrew_translation_queue.py claim --worker-id <stable-run-id>`. If it returns `EMPTY_QUEUE`, report that outcome and stop successfully.

After a successful claim, the queue coordinator reads `_meta.dependencies` in the claimed English JSON. For dependency Source codes present in the English `_generated/index-sources.json` but absent from the Chinese index, it raises the corresponding queued files to the top priority. Continue translating only the claimed file; subsequent workers receive the prioritized dependencies.

If the scheduler supplies a chunk lease, or the source has been placed in `chunked` state, read and follow `5etools-json-translate/references/chunked-worker.md` instead of claiming a normal task. Never turn a normal lease into ad-hoc chunks inside a worker.

For a successful lease:

1. Export `HOMEBREW_EN_ROOT` from the claim's source root and `HOMEBREW_ZH_ROOT` as the returned isolated target root.
2. Start the queue coordinator's `keepalive` sidecar immediately after a successful claim. Keep its PID and log outside the worktree, and stop it after `complete` or `fail`. Stage-boundary heartbeats remain useful checks but are not a substitute for the sidecar.
3. Use `$5etools-json-translate` in homebrew mode on the exact returned source path. The analyser establishes translation scope, but every candidate translation still requires contextual verification.
4. Renew the lease around long translator, independent-review, build, and test stages.
5. Stage and commit only the selected translated JSON or its intentional rename. Never commit `_generated` output.
6. Write the required structured result and call `complete`. A successful worker ends in queue state `ready`, not `merged`.

On any incomplete run, call `fail` before exiting. Mark the task blocked only when retrying cannot resolve the condition without human judgment. File size alone is not a blocked condition: return it for coordinator-managed chunk planning. Never run `integrate-next`; integration is a separate serial responsibility.
