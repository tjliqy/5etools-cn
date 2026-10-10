# Homebrew translation workflow

Read this reference whenever mode is `homebrew`.

## Paths and target identity

- English root: `HOMEBREW_EN_ROOT`, default `/data/homebrew-en/`.
- Chinese root: `HOMEBREW_ZH_ROOT`, default `/data/homebrew/`.
- Build and tests run from the resolved Chinese root. A queue worker sets it to its isolated Git worktree.

Split the English filename at the first literal `; `. Preserve the author prefix byte-for-byte. Treat the suffix before `.json` as the English resource title. Resolve its Chinese title in this order:

1. exact terminology evidence for the filename title;
2. a valid translator-produced localized filename;
3. the translated `_meta.sources[].full` only when that field denotes the same resource title.

Do not assume `_meta.sources[].full` is the title; it may instead contain an author, publisher, or source label. The final filename must be `<作者>; <中文资源名>.json`.

To find an existing renamed target, prefer the same relative directory, author prefix, and stable `_meta.sources[].json` set. Treat identity collisions as ambiguous and ask rather than selecting by filename similarity.

## Third-party IP terminology gate

Before translating names or prose, determine whether the resource adapts, crosses over with, or otherwise uses a non-D&D intellectual property. Inspect at least the filename and resource title, `_meta` source information, credits, and representative entity names or setting terms. Familiar franchise names, characters, locations, creatures, items, or cited source works are evidence of another IP; a generic genre resemblance alone is not.

If another IP is involved (for example, *Monster Hunter*), use internet search before choosing Chinese names for that IP. Search the complete IP name together with the relevant entity or term, and establish the terminology basis in this order:

1. official Simplified Chinese material from the IP owner, authorized Chinese publisher/localizer, or an official mainland China product page;
2. official Traditional Chinese material, converted to Simplified Chinese only when no official Simplified Chinese form is available and the wording remains identifiable;
3. a consistently attested Chinese name from multiple reputable secondary sources when no official Chinese localization can be found.

Do not treat search-result snippets, machine translation, fan wikis, or a single unsourced glossary as proof of an official standard name. Distinguish an official Chinese name from an established community translation in the working notes and handoff. Record the URLs and which names they support, use the selected forms consistently across the resource title, filename, entity names, and prose, and still preserve 5etools machine identifiers and tag routing fields. If reliable sources conflict or no defensible Chinese form is found, retain or transliterate the name consistently and report the uncertainty rather than inventing a “standard” translation.

If the resource does not involve another IP, record that conclusion briefly and continue with the ordinary D&D terminology workflow; no web search is required by this gate.

## Translation jobs

Use the translator analyser as the authority for which values are translatable:

```bash
/data/5e-translator/.venv/bin/python <skill-dir>/scripts/analyze_translation_jobs.py \
  "${HOMEBREW_EN_ROOT:-/data/homebrew-en}/path.json" --mode homebrew \
  [--target "${HOMEBREW_ZH_ROOT:-/data/homebrew}/path.json"]
```

The report always exposes every analyser job, including known database translations and jobs that do not require new translation, plus counts for actionable and known-translation jobs and a separate filename pseudo-job list. With `--target`, it also reports paths that could not be resolved. Exit code `1` means residual untranslated actionable content or an unresolved path remains. Review both categories; do not replace this check with a generic Latin-character scan. Machine strings omitted by the analyser are not untranslated merely because they contain English.

The analyser decides translation scope, not final wording. Treat each `known_translation`/`cn_str` as a context-sensitive candidate. Homographs and overloaded rules terms can require different Chinese at different paths: inspect the containing prose or object, field semantics, entity category, tags, and nearby mechanics before accepting it. Correct a candidate that conflicts with that context even when `need_translate` is false; do not globally replace every occurrence of the same English string with one Chinese term.

For a file containing `monster`, aligned Chinese core entities may supply terminology for analyser jobs. They do not expand translation scope. Preserve machine/index fields for which the analyser emitted no job, including values under `type.tags`, damage defenses, environments, trait/action tags, sense/language tags, and inflicted-condition indexes. The per-file schema gate is authoritative if repository legacy data disagrees.

## Existing target with a full-file scope

- Missing target: translate the complete file.
- Existing target: perform a complete audit, translate actionable analyser jobs that remain English, and context-check analyser-supplied translations already present, while preserving correct established Chinese text and localized additions.
- Replace established translations wholesale only when the user explicitly requests a retranslation.

## Validation and baseline

Before editing, capture the current full-repository test baseline:

```bash
python3 <skill-dir>/scripts/run_homebrew_tests.py \
  --capture-baseline "$HOMEBREW_TEST_BASELINE" \
  --homebrew-dir "${HOMEBREW_ZH_ROOT:-/data/homebrew}"
```

The baseline must be fully clean: every recorded test command must exit `0`, otherwise capture exits nonzero and translation work must not begin. `--allow-failing-baseline` exists only for explicit human diagnosis of a legacy failure; automated workers and integration must never use it.

After translation, compare the selected target's schema result with the English source:

```bash
python3 <skill-dir>/scripts/compare_homebrew_schema.py \
  "${HOMEBREW_EN_ROOT:-/data/homebrew-en}/path.json" \
  "${HOMEBREW_ZH_ROOT:-/data/homebrew}/path.json" \
  --homebrew-dir "${HOMEBREW_ZH_ROOT:-/data/homebrew}"
```

This per-file comparison uses the environment-compatible schema-fetch shim and supports Chinese `ENG_name` extensions. The target must either pass outright or introduce no schema-error signature beyond the English source. Existing source-schema incompatibilities are baseline evidence, not permission to add new target errors.

Then run `npm run build` in `HOMEBREW_ZH_ROOT`, the structure gate, and compare the remaining non-Schema repository test scripts with the baseline:

```bash
python3 <skill-dir>/scripts/run_homebrew_tests.py \
  --baseline-report "$HOMEBREW_TEST_BASELINE" \
  --homebrew-dir "${HOMEBREW_ZH_ROOT:-/data/homebrew}"
```

The comparison runs each test independently and rejects a failing baseline before candidate tests run. Investigate every candidate failure; every command must remain green.

`npm run build` rewrites `_generated/index-meta.json`, `index-props.json`, `index-sources.json`, and `index-timestamps.json`. Ignore these generated index changes: do not include them in the task output, review them, or revert them over user work.
