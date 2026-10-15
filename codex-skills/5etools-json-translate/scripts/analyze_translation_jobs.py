#!/usr/bin/env python3
"""Report translator analyser jobs and likely untranslated target occurrences."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

TRANSLATOR_ROOT = Path("/data/5e-translator")
sys.path.insert(0, str(TRANSLATOR_ROOT))

from app.core.translator.analyser.json_analyser import JsonAnalyser  # noqa: E402
from app.core.translator.job_need_translate_setter import JobNeedTranslateSetter  # noqa: E402


SEGMENT = re.compile(r"^(?P<key>[^[]+)(?:\[(?P<selector>.*)\])?$")
EMBEDDED_TAG_SUFFIX = re.compile(r"/(?P<tag>[A-Za-z0-9][A-Za-z0-9_-]*)\[\d+\]$")


def stable_token(value) -> str:
    text = re.sub(r"\s+", "-", str(value or "").strip())
    text = re.sub(r"[^0-9A-Za-z_.@|:-]+", "-", text).strip("-")
    if len(text) > 80:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
        text = f"{text[:70]}-{digest}"
    return text


# optionalfeature featureType values are routing keys into _meta.optionalFeatureTypes
# ("name" or cross-source "name:SOURCE") and stay byte-identical in translated files.
# Foundry VTT config subtrees are machine values substituted verbatim by Foundry/
# (also foundryClassFeature activities roll.formula dice strings like "d@flags.ll.exploit.faces")
# plutonium import: midiProperties enums ("default", "never"), midi-qol/dae/
# ActiveAuras/plutonium/dnd5e/core flags ("multi", "system", "turnStartSource",
# "1Attack", dedupeId, hash, sourceId, advancementOrigin) and heal-activity
# formulas ("@scale.dancer.special-dance-roll"). Translating any of them would
# break Foundry import semantics. foundryEffects change leaves (key/value like
# "system.attributes.senses.truesight"/"@attributes.senses.blindsight") are
# Foundry data-path/formula tokens with the same verbatim-substitution semantics.
# Feat-level foundryActivities carry the same semantics: save DC formulas
# ("8 + @prof + max(...)"), target.affects count formulas
# ("1 + @flags.ll.leadership.mod"), check.associated skill enums ("itm"), and
# consumption target data-paths ("currency.gp"). additionalSpells choose
# strings ("level=0|class=alternate sorcerer (llasorc)") are filter syntax.
# LLAW-style foundry feature sections nest the same activity data directly
# under "activities" (no foundryActivities wrapper): range value formulas
# ("30 * @scale.warlord.tactical-superiority"), save/dc.formula
# ("@flags.ll.exploit.dc"), target.affects count ("@flags.ll.leadership.mod"),
# intra-feature activity.id cross-references ("LLAWActivityZeAD"), and
# summon profiles cr ("floor(@classes.warlord.levels / 3)") are all
# Foundry-evaluated machine values.
MACHINE_LEAF = re.compile(r"/(alId|colStyles(?:\[\d+\])?|summonedByClass|style|type/tags(?:\[\d+\])?|spellcasting(?:\[\d+\])?/ability|featureType(?:\[\d+\])?|page|(?:skill|save)/[a-z]+|midiProperties/[A-Za-z0-9_]+|healing/bonus|flags(?:/[A-Za-z0-9_.%-]+|\[\d+\])+|foundryEffects(?:\[[^\]]*\])?/changes(?:\[\d+\])?/(?:key|mode|value|priority)|activities(?:\[[^\]]*\])?/roll\.formula|foundryActivities(?:\[[^\]]*\])?/save/dc\.formula|foundryActivities(?:\[[^\]]*\])?/target\.affects/count|foundryActivities(?:\[[^\]]*\])?/check\.associated(?:\[\d+\])?|foundryActivities(?:\[[^\]]*\])?/consumption/targets(?:\[\d+\])?/target|additionalSpells(?:\[[^\]]*\])?/(?:known|innate|prepared)/_\[\d+\]/choose|resources(?:\[[^\]]*\])?/count|activities(?:\[[^\]]*\])?/settings/(?:minimumAC|tempFormula)|activities(?:\[[^\]]*\])?/(?:range/value|save/dc\.formula|target\.affects/count|activity\.id)|activities(?:\[[^\]]*\])?/(?:summon/)?profiles(?:\[\d+\])?/cr)$")

# Renderer variable placeholders like "<$cha_mod$>" (item charge counts) are
# substituted verbatim by the site and must stay byte-identical.
VARIABLE_TOKEN = re.compile(r"^<\$[^<$]+\$>$")

# Renderer formulas mixing several variable placeholders with arithmetic, e.g.
# class.preparedSpells "<$level$> + <$cha_mod$>", are evaluated verbatim by the
# site and must stay byte-identical; single tokens are covered by VARIABLE_TOKEN.
VARIABLE_FORMULA = re.compile(
    r"^<\$[^<$]+\$>(?:\s*[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+))*$"
)

# Renderer formulas additionally wrapped in an evaluated math function, e.g.
# classFeature resources count "ceil(<$level$> / 2)" or main-repo
# "floor((<$level$> + 1) / 8) + 4", are evaluated verbatim by the site and must
# stay byte-identical; the zh data keeps such function formulas untranslated.
VARIABLE_FORMULA_FUNCTION = re.compile(
    r"^(?:ceil|floor|max|min)\(\s*<\$[^<$]+\$>\s*(?:[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+)\s*)+\)"
    r"(?:\s*[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+))*$"
)

# Foundry scene/map config values like "#ffffff" (foundrySceneRoot lights color) are
# machine color codes substituted verbatim by the renderer; they must stay byte-identical
# and are never translatable text.
HEX_COLOR_TOKEN = re.compile(r"^#[0-9A-Fa-f]{3,8}$")

# {@link display|url} field 0 is normally translatable display text, but a single-field
# bare URL ({@link incompetech.com}) is machine content rendered verbatim.
URL_TOKEN = re.compile(r"^(?:https?://|www\.)?[A-Za-z0-9][A-Za-z0-9_%#,&=./?+-]*\.[A-Za-z]{2,}(?:[/?#][^\s]*)?$")

# Tag-segment sub-jobs address individual pipe fields inside a containing string, e.g.
# uid "...entries[0].condition[0].1" is pipe field 1 of the second {@condition ...} tag.
# Tag names may start with a digit ({@5etools ...}).
TAG_FIELD_UID = re.compile(r"\.(?P<tag>[A-Za-z0-9][A-Za-z0-9_-]*)\[\d+\]\.(?P<field>\d+)$")
# Malformed tags missing their type ("{@ baby mimics|src}" -> uid "...entries[2].[1].0")
# are source defects kept byte-identical; their key paths carry an unresolvable bare
# "/[N]" tag segment and the swallowed first word is not an entity reference.
MALFORMED_TAG_UID = re.compile(r"\.\[\d+\]\.\d+$")
# Variable-style tags whose pipe field 0 is a machine variable name (VDC/Vdist/Vdam) or number.
# Their field 0 is always a formula/variable ("10 + PB", "1d6 − 1", "int 20"), never display
# prose, so whitespace/operators do not make it translatable.
VARIABLE_TAGS = {"footnote", "damage", "dice", "scaledice", "scaledamage", "hit", "dc", "ability", "skillCheck"}
# Tags whose pipe fields >=1 are routing anchors that must stay byte-identical to the
# untranslated section ids even though they contain spaces, e.g.
# {@area 压力板陷阱|3. Pressure Plate Trap|x} routes to id "3. Pressure Plate Trap".
ROUTE_TAG_FIELDS = {"area"}
# Machine tokens carry no whitespace: source codes (HFN2025, MD-BNR), URLs
# (quickreference.html#bookref-quick,3,surprise,0), variable scale labels (Vdam x 2),
# numeric ranges (12/14/15), style parameters (dnd-font;large). Prose always contains spaces.
# Source codes may carry a colon: declared abbreviations (KT:SB) and pipe-suffix
# routing forms ("kibblestasty:cc"/"kibblestasty:bms" in classSpells) stay
# byte-identical machine anchors even when the dependency is undeclared in _meta.
MACHINE_TOKEN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./#,%?=&;:-]*(?: x \d+)?$")
# Dice-math expressions whose only word token is the proficiency bonus alias,
# e.g. "+ PB" or "30 + 10 × PB". Pure machine math, never translatable prose.
PB_FORMULA = re.compile(r"[+\-−\d\s,dD×xX*/().]*PB[+\-−\d\s,dD×xX*/().]*")
# Foundry/plutonium @-variable formulas surfaced in item display fields, e.g.
# dmg1 "1d10 + @srd5e.userchar.pb" or bonusWeaponAttack "3 + @srd5e.userchar.pb",
# are substituted verbatim by the renderer/Foundry and stay byte-identical.
AT_VARIABLE_FORMULA = re.compile(
    r"^(?:[0-9]+|d[0-9]+)[0-9a-zA-Z_+\-*/().\s]*@[a-zA-Z_][a-zA-Z0-9_.]*[0-9a-zA-Z_+\-*/().\s]*$"
)
# Matches a 5etools tag and captures its display text (pipe field 0). Used to
# project a target string down to prose + localized display text before the
# residual substring check, so English inside routing fields (pipe fields >= 1,
# e.g. {@loader 战斗轮椅|collection/Sara Thompson; The Combat Wheelchair.json})
# cannot be mistaken for untranslated prose.
TAG_DISPLAY_ONLY = re.compile(r"\{@[^{}|]+\s([^|{}]*)(?:\|[^{}]*)*\}")


def is_machine_tag_field(job) -> bool:
    """True for tag-segment sub-jobs addressing a routing/machine pipe field."""
    match = TAG_FIELD_UID.search(job.uid or "")
    if not match:
        return False
    field = int(match.group("field"))
    tag = match.group("tag")
    if field == 0 and tag == "link" and URL_TOKEN.fullmatch(job.en_str or ""):
        return True
    if field == 0 and tag in VARIABLE_TAGS:
        # Variable formulas ("10 + PB", "1d6 − 1", "int 20") contain spaces/operators but
        # are never translatable display text.
        return True
    if field == 0 and tag not in VARIABLE_TAGS:
        return False
    if field >= 1 and tag in ROUTE_TAG_FIELDS:
        return True
    return bool(MACHINE_TOKEN.fullmatch(job.en_str or ""))


def path_segments(key_path: str):
    if key_path.startswith("."):
        return key_path[1:].split(".")
    return [part for part in key_path.strip("/").split("/") if part]


def resolve_job_value(root, key_path: str):
    current = root
    resolved = ""
    for raw in path_segments(key_path):
        match = SEGMENT.match(raw)
        if not match or not isinstance(current, dict):
            return None, None
        key, selector = match.group("key"), match.group("selector")
        if key not in current:
            return None, None
        current = current[key]
        resolved += "/" + key
        if selector is None:
            continue
        if re.fullmatch(r"\d+\](?:\[\d+)*", selector):
            # analyser emits nested row-cell selectors as e.g. "rows[0][0]" -> selector "0][0]"
            for index in (int(part) for part in selector.replace("]", "").split("[")):
                if not isinstance(current, list) or index >= len(current):
                    return None, None
                current = current[index]
                resolved += f"/{index}"
            continue
        indexed_named = re.fullmatch(r"(\d+)\]\[(name=[^\]]+)$", selector)
        if indexed_named:
            # analyser emits index-anchored row-cell selectors as e.g. "rows[0][name=X]" ->
            # selector "0][name=X]": index the row, then select the named cell within it.
            index = int(indexed_named.group(1))
            if not isinstance(current, list) or index >= len(current):
                return None, None
            row = current[index]
            if not isinstance(row, list):
                return None, None
            expected = dict(part.split("=", 1) for part in indexed_named.group(2).split(";") if "=" in part)
            matches = []
            for cell_index, cell in enumerate(row):
                if not isinstance(cell, dict):
                    continue
                if all(
                    value in {stable_token(actual) for actual in ([cell.get(field)] + ([cell.get("ENG_name")] if field == "name" else []))}
                    for field, value in expected.items()
                ):
                    matches.append(cell_index)
            if len(matches) != 1:
                return None, None
            current = row[matches[0]]
            resolved += f"/{index}/{matches[0]}"
            continue
        if not isinstance(current, list):
            return None, None
        if selector.isdigit():
            index = int(selector)
        else:
            expected = dict(part.split("=", 1) for part in selector.split(";") if "=" in part and not part.startswith("index="))
            explicit_index = next((part.split("=", 1)[1] for part in selector.split(";") if part.startswith("index=")), None)
            candidates = []
            for item_index, item in enumerate(current):
                if not isinstance(item, dict):
                    continue
                matches = True
                for field, value in expected.items():
                    actuals = [item.get(field)]
                    if field == "name":
                        actuals.append(item.get("ENG_name"))
                    if value not in {stable_token(actual) for actual in actuals}:
                        matches = False
                        break
                if matches:
                    candidates.append(item_index)
            if explicit_index is not None and int(explicit_index) in candidates:
                index = int(explicit_index)
            elif len(candidates) == 1:
                index = candidates[0]
            else:
                return None, None
        if index >= len(current):
            return None, None
        current = current[index]
        resolved += f"/{index}"
    return resolved or "/", current


def resolve_job_target(root, key_path: str):
    """Resolve a JSON value, folding analyser-only embedded-tag suffixes to their parent string."""
    target_path, target_value = resolve_job_value(root, key_path)
    if target_path is not None:
        return target_path, target_value
    match = EMBEDDED_TAG_SUFFIX.search(key_path)
    if match:
        return resolve_job_value(root, key_path[: match.start()])
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--target", type=Path)
    parser.add_argument("--mode", choices=("5et", "homebrew"), default="5et")
    args = parser.parse_args()

    source = args.source.resolve()
    config = {"metadata": {"mode": args.mode, "force": False, "byhand": False, "force_title": False}}
    infos = list(JsonAnalyser(read_only=True).invoke([str(source)], config=config))
    infos = list(JobNeedTranslateSetter().invoke(infos, config=config))
    if len(infos) != 1:
        parser.error(f"expected one analyser result, got {len(infos)}")

    target_data = None
    if args.target:
        target = args.target.resolve()
        target_data = json.loads(target.read_text(encoding="utf-8-sig"))

    # Source codes (e.g. "TTNSP") are machine identifiers, never translatable text; the
    # analyser still emits tag-segment sub-jobs for them, so exclude them like MACHINE_LEAF.
    # Matching is case-insensitive: in-text references use the lowercase form ("blaze|ar1")
    # while _meta declares "Ar1".
    source_codes = set()
    source_meta_json = json.loads(source.read_text(encoding="utf-8-sig"))
    for source_meta in source_meta_json.get("_meta", {}).get("sources", []):
        for field in ("json", "abbreviation"):
            value = source_meta.get(field)
            if isinstance(value, str):
                source_codes.add(value.lower())
    # Cross-file dependency source codes (_meta.dependencies values and
    # _test.references) are machine routing identifiers for files that are not
    # among this file's own _meta.sources; their bare form stays byte-identical
    # in every pipe field exactly like a declared source code, so exempt it too.
    for dep_values in source_meta_json.get("_meta", {}).get("dependencies", {}).values():
        if isinstance(dep_values, list):
            source_codes.update(str(v).lower() for v in dep_values if isinstance(v, str))
    for ref in source_meta_json.get("_test", {}).get("references", []):
        if isinstance(ref, str):
            source_codes.add(ref.lower())

    jobs = []
    residuals = []
    filename_jobs = []
    unresolved_paths = []
    for job in infos[0].job_list:
        item = {
            "uid": job.uid,
            "key_path": job.key_path,
            "entry_path": job.entry_path,
            "tag": job.tag,
            "english": job.en_str,
            "known_translation": job.cn_str,
            "need_translate": bool(job.need_translate),
        }
        jobs.append(item)
        if not job.key_path:
            filename_jobs.append(item)
            continue
        if args.target and isinstance(job.en_str, str):
            if job.en_str.lower() in source_codes:
                continue
            # A tag tokenizer artifact appends the closing bracket to a source
            # code ("@creature[名称|LLVessel]" emits sub-job "LLVessel]"); the
            # bracket-stripped token is still a machine routing code.
            if job.en_str.lower().rstrip("]") in source_codes:
                continue
            if VARIABLE_TOKEN.match(job.en_str):
                continue
            if VARIABLE_FORMULA.match(job.en_str) or VARIABLE_FORMULA_FUNCTION.match(job.en_str):
                continue
            if HEX_COLOR_TOKEN.match(job.en_str):
                continue
            # Free-standing dice-math expressions that mention the proficiency
            # bonus (monster ac[].condition "+ PB", hp.special "30 + 10 × PB")
            # stay byte-identical to the source: the renderer's dice tokenizer
            # only understands the literal "PB" token, and the repo keeps such
            # formulas untranslated. Same machine class as VARIABLE_TAGS math.
            if PB_FORMULA.fullmatch(job.en_str):
                continue
            if AT_VARIABLE_FORMULA.fullmatch(job.en_str):
                continue
            if MALFORMED_TAG_UID.search(job.uid or ""):
                continue
            plain_path, plain_value = resolve_job_value(target_data, job.key_path)
            target_path, target_value = resolve_job_target(target_data, job.key_path)
            if target_path is None and path_segments(job.key_path)[:1] == ["optionalFeatureTypes"]:
                # The analyser drops the "_meta" prefix on jobs anchored under
                # _meta.optionalFeatureTypes; retry once with the prefix restored.
                meta_key_path = "/_meta/" + job.key_path.lstrip("/")
                plain_path, plain_value = resolve_job_value(target_data, meta_key_path)
                target_path, target_value = resolve_job_target(target_data, meta_key_path)
            if target_path is None:
                unresolved_paths.append(item)
                continue
            # A tag-segment token job only folds to its parent string; a plain string
            # job resolves directly. Only token jobs may be machine-excluded.
            is_token_job = plain_path is None or not isinstance(plain_value, str)
            if is_token_job and is_machine_tag_field(job):
                continue
            if (
                isinstance(target_value, str)
                and any(job.en_str.lower() in sc for sc in source_codes if sc)
            ):
                # An English fragment may survive only as part of a source-code
                # routing anchor (class name "Mesmer" inside "ADMesmer"), which
                # must stay byte-identical in every pipe field it occupies.
                stripped = target_value
                for sc in source_codes:
                    if sc:
                        stripped = re.sub(re.escape(sc), "", stripped, flags=re.IGNORECASE)
                if job.en_str.lower() not in stripped.lower():
                    continue
            # Routing pipe fields (index >= 1) are machine anchors that stay
            # byte-identical to filenames/source codes; English they contain
            # must not count as untranslated display text when a tag's
            # display (field 0) has already been localized. Bare pipe-suffixed
            # routing entries (classSpells "感知鲜血|kibblestasty:bms") carry the
            # same anchors without braces: for a pipe-field sub-job, project the
            # containing string down to its display segment (before the first
            # pipe) so undeclared dependency codes are not flagged as prose.
            uid_field = TAG_FIELD_UID.search(job.uid or "")
            if (
                uid_field
                and int(uid_field.group("field")) >= 1
                and isinstance(target_value, str)
                and "|" in target_value
            ):
                projected_value = target_value.split("|", 1)[0]
            elif isinstance(target_value, str):
                projected_value = TAG_DISPLAY_ONLY.sub(
                    lambda m: m.group(1), target_value
                )
            else:
                projected_value = target_value
            untranslated = job.en_str == target_value or (
                job.need_translate
                and isinstance(target_value, str)
                and job.en_str in projected_value
            )
            if untranslated and job.need_translate and not MACHINE_LEAF.search(job.key_path):
                residuals.append({**item, "target_paths": [target_path]})

    report = {
        "source": str(source),
        "target": str(args.target.resolve()) if args.target else None,
        "mode": args.mode,
        "job_count": len(jobs),
        "actionable_job_count": sum(1 for item in jobs if item["need_translate"]),
        "known_translation_job_count": sum(1 for item in jobs if isinstance(item["known_translation"], str)),
        "residual_count": len(residuals),
        "unresolved_path_count": len(unresolved_paths),
        "jobs": jobs,
        "filename_jobs": filename_jobs,
        "residuals": residuals,
        "unresolved_paths": unresolved_paths,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if residuals or unresolved_paths else 0


if __name__ == "__main__":
    raise SystemExit(main())
