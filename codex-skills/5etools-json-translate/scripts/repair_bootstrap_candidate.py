#!/usr/bin/env python3
"""Restore source structure/non-text scalars in a generated translation candidate."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

LOCALIZED_ONLY_KEYS = {"ENG_name", "translator"}
PLACEHOLDER = "{!@"


def repair(source, candidate, path=""):
    changes = []
    if isinstance(source, dict):
        candidate = candidate if isinstance(candidate, dict) else {}
        out = {
            key: copy.deepcopy(value)
            for key, value in candidate.items()
            if key in LOCALIZED_ONLY_KEYS
            or (path == "/_meta" and key == "translators")
        }
        for key, source_value in source.items():
            child_path = f"{path}/{key}"
            if key not in candidate:
                out[key] = copy.deepcopy(source_value)
                changes.append({"path": child_path, "action": "restore_missing_key"})
            else:
                out[key], child_changes = repair(source_value, candidate[key], child_path)
                changes.extend(child_changes)
        return out, changes
    if isinstance(source, list):
        candidate = candidate if isinstance(candidate, list) else []
        out = []
        for index, source_value in enumerate(source):
            if index >= len(candidate):
                out.append(copy.deepcopy(source_value))
                changes.append({"path": f"{path}/{index}", "action": "restore_missing_item"})
            else:
                value, child_changes = repair(source_value, candidate[index], f"{path}/{index}")
                out.append(value)
                changes.extend(child_changes)
        if len(candidate) > len(source):
            changes.append({"path": path or "/", "action": "drop_extra_items", "count": len(candidate) - len(source)})
        return out, changes
    if isinstance(source, str):
        if isinstance(candidate, str) and PLACEHOLDER in candidate:
            return source, [{"path": path or "/", "action": "restore_placeholder_fallback"}]
        return candidate if isinstance(candidate, str) else source, []
    if candidate != source or type(candidate) is not type(source):
        return copy.deepcopy(source), [{"path": path or "/", "action": "restore_non_text_scalar", "value": source}]
    return candidate, []


def find_placeholders(value, path=""):
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            found.extend(find_placeholders(child, f"{path}/{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_placeholders(child, f"{path}/{index}"))
    elif isinstance(value, str) and PLACEHOLDER in value:
        found.append(path or "/")
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--jobs", type=Path, help="optional translator .jobs sidecar")
    args = parser.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8-sig"))
    candidate = json.loads(args.candidate.read_text(encoding="utf-8-sig"))
    repaired, changes = repair(source, candidate)
    placeholders = find_placeholders(repaired)
    pending_jobs = []
    if args.jobs:
        for job in json.loads(args.jobs.read_text(encoding="utf-8-sig")):
            if job.get("need_translate") and not isinstance(job.get("cn_str"), str):
                pending_jobs.append({key: job.get(key) for key in ("uid", "key_path", "en_str")})

    report = {"changes": changes, "placeholders": placeholders, "pending_translation_jobs": pending_jobs}
    if placeholders:
        print(json.dumps({"passed": False, **report}, ensure_ascii=False, indent=2))
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(repaired, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "output": str(args.output), **report}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
