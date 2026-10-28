# Chunked homebrew worker

Use this workflow only for a large homebrew source explicitly planned by `homebrew_translation_chunks.py`. It preserves one source JSON, one persistent parent worktree, and one final integration commit while allowing bounded worker invocations.

## Coordinator lifecycle

Create a deterministic plan after the normal queue `sync`:

```bash
python3 <skill-dir>/scripts/homebrew_translation_chunks.py plan \
  --source-path 'adventure/Author; Large Adventure.json' \
  --max-chunk-chars 80000
```

Planning changes the ordinary task to `chunked`, creates one persistent parent worktree, divides top-level array entries into JSON-pointer scopes, and inventories repeated `name` fields as pending parent-level terms. It does not alter the English source.

## First terminology pass: chunk-level entity extraction

Before locking any initial glossary terms or translating chunk content, run one dedicated extraction round over the planned chunks. Start one read-only subagent per chunk (or process the chunks in bounded batches if there are more chunks than available agent capacity). Give each subagent only its chunk's exact JSON-pointer scope, the relevant English source content and context, applicable user references, and read-only terminology/entity lookup access.

Each subagent's sole task is to find entity names in its assigned chunk and propose Chinese renderings. Include proper names and named entities such as people, places, creatures/monsters, organizations, skills, spells, items, and other named game entities. Capture the English form, entity type/sense, stable JSON pointer(s), proposed Chinese form, and concise supporting evidence or uncertainty. Do not ask these subagents to translate prose, edit the target, modify the glossary, lock terms, or make decisions across chunks. They must report candidates only; they must not infer a file-wide decision from their chunk alone.

The main agent owns the terminology decision. Merge proposals by English form and sense, inspect their source contexts and evidence, query the reference corpus for ambiguous or conflicting forms, and resolve cross-chunk disagreements centrally. Keep distinct senses separate where an English form genuinely names different entity types; do not paper over conflicting proper-name translations as contextual senses. Record unresolved uncertainty rather than silently choosing a weak candidate. Only after this adjudication should the main agent add or lock terms in the parent glossary. If subagents disagree, the main agent records the selected form and the evidence/priority that controls it; the glossary must have one binding form for each `English + sense` before dependent chunks are translated.

This extraction round is terminology-only and does not count as a chunk translation or alter any target file. The ordinary chunk workers still translate only their leased JSON pointers and must report actual glossary usage and any new proposals under the existing chunk-result contract.

Resolve the initial terminology inventory before finalization. Each main-agent glossary decision increments the glossary version:

```bash
python3 <skill-dir>/scripts/homebrew_translation_chunks.py set-term \
  --source-path '<relative-source>' --english '<English>' \
  --sense '<entity-or-top-level-category>' --chinese '<中文>' --status locked
```

Use `contextual` only when one English surface form legitimately has multiple meanings. Give each meaning a distinct `sense`; never weaken a proper-name conflict into a contextual term merely to pass the audit.

The final audit also flags one Chinese form used for multiple distinct English terms. If repository evidence proves that the collision is an intentional alias rather than an entity conflation, record it explicitly with `allow-collision --chinese '<中文>' --rationale '<evidence>'`. Never add a blanket allowance or an empty rationale.

## Chunk lease

Claim exactly one chunk. A parent permits only one active chunk lease because all chunks share its worktree:

```bash
python3 <skill-dir>/scripts/homebrew_translation_chunks.py claim-chunk \
  --source-path '<relative-source>' --worker-id '<stable-run-id>'
```

The result contains the exact JSON pointers, previous checkpoint commit, current glossary version, complete glossary, parent worktree, and source hash. Start the chunk coordinator's `keepalive` sidecar immediately. An expired but unreclaimed lease may be recovered only by the recorded worker with `resume-chunk`.

Translate only the returned pointers. On the first chunk, a missing target may be structurally bootstrapped from the complete source, but only the leased pointers may receive translated content. Later chunk commits are mechanically checked against their pointer scope. Produce exactly one commit directly on the returned checkpoint and modify only the selected target JSON.

Every chunk result must include:

```json
{
  "target": "adventure/Author; 中文名.json",
  "commit_sha": "<parent-worktree HEAD>",
  "glossary_version": 3,
  "review": {"rounds": 1, "result": "PASS"},
  "term_usage": [
    {
      "english": "Sea Princes",
      "sense": "organization",
      "chinese": "海上王子",
      "paths": ["/adventureData/3/entries/7"]
    }
  ],
  "term_proposals": []
}
```

Report every parent-glossary term used in the leased pointers. New or uncertain terms go in `term_proposals`; a coordinator must resolve them with `set-term`. A locked mismatch rejects chunk completion. Changing a locked term marks affected completed chunks `stale` so they are claimed for targeted repair.

Complete with `complete-chunk`. On failure use `fail-chunk`; do not delete the persistent parent worktree.

If the English source hash changes before finalization, stop claiming chunks. After any live chunk lease has been failed or reclaimed, run `abort-parent --reason '<source changed>'`. It removes only that parent's worktree, branch, checkpoints, glossary, and chunk records, refreshes the queued source hash, and returns the task to `needs_chunking` for a clean plan. Never carry checkpoints or terminology usage across source hashes.

## Final terminology and integration gate

After all chunks finish, run `audit-terminology`. It rejects unfinished/stale chunks, unresolved glossary terms or proposals, multiple Chinese forms for one `English + sense`, and usage that conflicts with a locked term.

Then perform a global independent terminology review using cross-chunk context packets, run the full-file analyser with zero residual/unresolved paths, and run JSON, structure, schema, build, and test validation. The final result must contain the ordinary worker report plus:

```json
{"terminology": {"result": "PASS"}}
```

`finalize` repeats the mechanical terminology gate, verifies the unchanged source hash and clean parent worktree, squashes all checkpoint commits into exactly one commit directly on the original base, and changes the ordinary queue task to `ready`. Only the existing serial `integrate-next` process may merge it.
