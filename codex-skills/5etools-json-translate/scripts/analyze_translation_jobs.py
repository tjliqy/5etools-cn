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
EMBEDDED_TAG_SUFFIX = re.compile(r"/(?P<tag>[A-Za-z][A-Za-z0-9_-]*)\[\d+\]$")


def stable_token(value) -> str:
    text = re.sub(r"\s+", "-", str(value or "").strip())
    text = re.sub(r"[^0-9A-Za-z_.@|:-]+", "-", text).strip("-")
    if len(text) > 80:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
        text = f"{text[:70]}-{digest}"
    return text


MACHINE_LEAF = re.compile(r"/(alId|colStyles(?:\[\d+\])?|summonedByClass|style|type/tags(?:\[\d+\])?|spellcasting(?:\[\d+\])?/ability)$")

# Tag-segment sub-jobs address individual pipe fields inside a containing string, e.g.
# uid "...entries[0].condition[0].1" is pipe field 1 of the second {@condition ...} tag.
TAG_FIELD_UID = re.compile(r"\.(?P<tag>[A-Za-z][A-Za-z0-9_-]*)\[\d+\]\.(?P<field>\d+)$")
# Variable-style tags whose pipe field 0 is a machine variable name (VDC/Vdist/Vdam) or number.
VARIABLE_TAGS = {"footnote", "damage", "dice", "scaledice", "scaledamage", "hit", "dc"}
# Machine tokens carry no whitespace: source codes (HFN2025, MD-BNR), URLs, variable
# scale labels (Vdam x 2), numeric ranges (12/14/15). Prose always contains spaces.
MACHINE_TOKEN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./-]*(?: x \d+)?$")


def is_machine_tag_field(job) -> bool:
    """True for tag-segment sub-jobs addressing a routing/machine pipe field."""
    match = TAG_FIELD_UID.search(job.uid or "")
    if not match:
        return False
    field = int(match.group("field"))
    if field == 0 and match.group("tag") not in VARIABLE_TAGS:
        return False
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
    source_codes = set()
    for source_meta in json.loads(source.read_text(encoding="utf-8-sig")).get("_meta", {}).get("sources", []):
        for field in ("json", "abbreviation"):
            value = source_meta.get(field)
            if isinstance(value, str):
                source_codes.add(value)

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
            if job.en_str in source_codes:
                continue
            plain_path, plain_value = resolve_job_value(target_data, job.key_path)
            target_path, target_value = resolve_job_target(target_data, job.key_path)
            if target_path is None:
                unresolved_paths.append(item)
                continue
            # A tag-segment token job only folds to its parent string; a plain string
            # job resolves directly. Only token jobs may be machine-excluded.
            is_token_job = plain_path is None or not isinstance(plain_value, str)
            if is_token_job and is_machine_tag_field(job):
                continue
            untranslated = job.en_str == target_value or (job.need_translate and isinstance(target_value, str) and job.en_str in target_value)
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
