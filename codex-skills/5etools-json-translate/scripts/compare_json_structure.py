#!/usr/bin/env python3
"""Compare an English source JSON with its localized target structurally."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


DEFAULT_ALLOWED_EXTRA_KEYS = {"ENG_name", "translator"}
META_TRANSLATORS_PATH = "/_meta/translators"
DEFAULT_TRANSLATED_KEY_PATHS = ("*/containerCapacity/item/*",)
MAX_ALLOWED_DIFFERENCE_EXAMPLES = 50
TAG_ONLY_NAME = re.compile(r"^\{@[^ ]+ ([^|}]+)(?:\|[^}]*)?}$")


def _pointer_part(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def _child_path(path: str, value: str | int) -> str:
    return f"{path}/{_pointer_part(str(value))}"


def _type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, dict):
        return "object"
    if isinstance(value, list):
        return "array"
    if isinstance(value, str):
        return "string"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    return type(value).__name__


def _issue_id(issue: dict[str, Any]) -> str:
    stable = {
        key: issue[key]
        for key in ("code", "path", "expected", "actual")
        if key in issue
    }
    encoded = json.dumps(stable, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


class StructureComparator:
    def __init__(
        self,
        allowed_extra_keys: set[str],
        translated_key_paths: tuple[str, ...],
    ) -> None:
        self.allowed_extra_keys = allowed_extra_keys
        self.translated_key_paths = translated_key_paths
        self.errors: list[dict[str, Any]] = []
        self.warnings: list[dict[str, Any]] = []
        self.allowed_differences: list[dict[str, Any]] = []
        self.allowed_difference_count = 0

    def error(self, code: str, path: str, message: str, **details: Any) -> None:
        issue = {"code": code, "path": path or "/", "message": message, **details}
        issue["issue_id"] = _issue_id(issue)
        self.errors.append(issue)

    def warning(self, code: str, path: str, message: str, **details: Any) -> None:
        issue = {"code": code, "path": path or "/", "message": message, **details}
        issue["issue_id"] = _issue_id(issue)
        self.warnings.append(issue)

    def allow(self, difference: dict[str, Any]) -> None:
        self.allowed_difference_count += 1
        if len(self.allowed_differences) < MAX_ALLOWED_DIFFERENCE_EXAMPLES:
            self.allowed_differences.append(difference)

    def compare(self, source: Any, target: Any, path: str = "") -> None:
        source_type = _type_name(source)
        target_type = _type_name(target)
        if source_type != target_type:
            self.error(
                "type_mismatch",
                path,
                "JSON value type changed during localization",
                expected=source_type,
                actual=target_type,
            )
            return

        if isinstance(source, dict):
            self._compare_object(source, target, path)
            return
        if isinstance(source, list):
            if len(source) != len(target):
                self.error(
                    "array_length_mismatch",
                    path,
                    "Array length differs from the English source",
                    expected=len(source),
                    actual=len(target),
                )
            for index, (source_item, target_item) in enumerate(zip(source, target)):
                self.compare(source_item, target_item, _child_path(path, index))
            return

        if not isinstance(source, str) and source != target:
            self.error(
                "scalar_value_mismatch",
                path,
                "Non-text scalar value changed during localization",
                expected=source,
                actual=target,
            )

    def _compare_object(
        self, source: dict[str, Any], target: dict[str, Any], path: str
    ) -> None:
        source_keys = list(source)
        target_core_keys = [
            key
            for key in target
            if (key not in self.allowed_extra_keys or key in source)
            and not (path == "/_meta" and key == "translators" and key not in source)
        ]
        source_set = set(source_keys)
        target_core_set = set(target_core_keys)

        if source_set != target_core_set and self._is_translated_key_map(path):
            self._compare_translated_key_map(
                source,
                {key: target[key] for key in target_core_keys},
                path,
            )
        else:
            for key in sorted(source_set - target_core_set):
                self.error(
                    "missing_key",
                    _child_path(path, key),
                    "Key from the English source is missing in the localized JSON",
                    expected="present",
                    actual="missing",
                )
            for key in sorted(target_core_set - source_set):
                self.error(
                    "unexpected_key",
                    _child_path(path, key),
                    "Localized JSON contains a key not present in the English source",
                    expected="absent",
                    actual="present",
                )
            for key in source_keys:
                if key in target_core_set:
                    self.compare(source[key], target[key], _child_path(path, key))

        for key in self.allowed_extra_keys:
            if key not in target or key in source:
                continue
            value = target[key]
            if key in {"ENG_name", "translator"} and not isinstance(value, str):
                self.error(
                    "localized_metadata_type",
                    _child_path(path, key),
                    f"Localized metadata field {key!r} must be a string",
                    expected="string",
                    actual=_type_name(value),
                )
            else:
                self.allow(
                    {
                        "code": "localized_metadata",
                        "path": _child_path(path, key),
                        "message": f"Allowed localized-only field {key!r}",
                    }
                )

        if path == "/_meta" and "translators" in target and "translators" not in source:
            value = target["translators"]
            if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
                self.error(
                    "localized_metadata_type",
                    META_TRANSLATORS_PATH,
                    "Localized metadata field 'translators' must be an array of strings",
                    expected="array of strings",
                    actual=_type_name(value),
                )
            else:
                self.allow({
                    "code": "localized_metadata",
                    "path": META_TRANSLATORS_PATH,
                    "message": "Allowed localized-only field 'translators'",
                })

        source_name = source.get("name")
        if (
            isinstance(source_name, str)
            and "ENG_name" not in source
            and "ENG_name" in target
            and isinstance(target["ENG_name"], str)
            and target["ENG_name"] not in self._english_name_candidates(source_name)
        ):
            self.error(
                "english_name_identity_mismatch",
                _child_path(path, "ENG_name"),
                "ENG_name no longer identifies the aligned English object",
                expected=sorted(self._english_name_candidates(source_name)),
                actual=target["ENG_name"],
            )

        if (
            isinstance(source.get("name"), str)
            and isinstance(target.get("name"), str)
            and source["name"] != target["name"]
            and "ENG_name" not in target
        ):
            self.warning(
                "missing_english_name_anchor",
                path,
                "Translated name has no ENG_name anchor; verify array/object alignment manually",
                expected=source["name"],
                actual=target["name"],
            )

    @staticmethod
    def _english_name_candidates(source_name: str) -> set[str]:
        candidates = {source_name}
        tag_match = TAG_ONLY_NAME.fullmatch(source_name)
        if tag_match:
            candidates.add(tag_match.group(1))
        return candidates

    def _is_translated_key_map(self, path: str) -> bool:
        return any(fnmatch.fnmatchcase(path, pattern) for pattern in self.translated_key_paths)

    def _compare_translated_key_map(
        self, source: dict[str, Any], target: dict[str, Any], path: str
    ) -> None:
        source_items = list(source.items())
        target_items = list(target.items())
        if len(source_items) != len(target_items):
            self.error(
                "translated_key_map_length_mismatch",
                path,
                "Localized-key map has a different number of entries",
                expected=len(source_items),
                actual=len(target_items),
            )

        for index, ((source_key, source_value), (target_key, target_value)) in enumerate(
            zip(source_items, target_items)
        ):
            source_suffix = source_key.split("|", 1)[1:] or None
            target_suffix = target_key.split("|", 1)[1:] or None
            if source_suffix != target_suffix:
                self.error(
                    "translated_key_identity_mismatch",
                    _child_path(path, f"@key[{index}]"),
                    "Translated map key changed its non-display identity suffix",
                    expected=source_key,
                    actual=target_key,
                )
            self.compare(
                source_value,
                target_value,
                _child_path(path, f"@value[{index}]"),
            )

        self.allow(
            {
                "code": "translated_map_keys",
                "path": path or "/",
                "message": "Map display keys may be localized; values were compared in source order",
                "source_keys": list(source),
                "target_keys": list(target),
            }
        )


def _mapped_target(source: Path, mode: str) -> Path:
    if mode == "homebrew":
        source_root = Path("/data/homebrew-en")
        try:
            return Path("/data/homebrew") / source.relative_to(source_root)
        except ValueError as exc:
            raise ValueError(f"source path must be under {source_root}") from exc
    parts = list(source.parts)
    try:
        index = parts.index("data-bak")
    except ValueError as exc:
        raise ValueError("source path must be under a data-bak directory") from exc
    parts[index] = "data"
    return Path(*parts)


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _load_baseline(path: Path) -> set[str]:
    data = _load_json(path)
    errors = data.get("errors")
    if not isinstance(errors, list):
        raise ValueError("baseline report does not contain an errors array")
    return {
        issue["issue_id"]
        for issue in errors
        if isinstance(issue, dict) and isinstance(issue.get("issue_id"), str)
    }


def _write_report(path: Path, report: dict[str, Any]) -> None:
    if path.exists() and not path.is_file():
        raise ValueError(f"report path is not a regular file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compare data-bak English JSON and data Chinese JSON structure. "
            "Strings may differ; keys, arrays, value types, and non-text scalars may not."
        )
    )
    parser.add_argument("source", type=Path, help="English JSON under the selected mode's source root")
    parser.add_argument("target", type=Path, nargs="?", help="localized JSON; inferred if omitted")
    parser.add_argument("--mode", choices=("5et", "homebrew"), default="5et")
    parser.add_argument(
        "--allow-extra-key",
        action="append",
        default=[],
        help="additional localized-only object key (repeatable)",
    )
    parser.add_argument(
        "--translated-key-path",
        action="append",
        default=[],
        metavar="GLOB",
        help="JSON-pointer glob for an ordered map whose display keys are translated",
    )
    baseline_group = parser.add_mutually_exclusive_group()
    baseline_group.add_argument(
        "--capture-baseline",
        type=Path,
        metavar="REPORT",
        help="write the current report as a baseline and exit successfully",
    )
    baseline_group.add_argument(
        "--baseline-report",
        type=Path,
        metavar="REPORT",
        help="treat matching errors in an earlier report as pre-existing",
    )
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_file():
        parser.error(f"source JSON does not exist: {source}")
    if source.suffix.lower() != ".json":
        parser.error(f"source must be a JSON file: {source}")
    if args.target:
        target = args.target.resolve()
    else:
        try:
            target = _mapped_target(source, args.mode)
        except ValueError as exc:
            parser.error(str(exc))

    comparator = StructureComparator(
        DEFAULT_ALLOWED_EXTRA_KEYS | set(args.allow_extra_key),
        DEFAULT_TRANSLATED_KEY_PATHS + tuple(args.translated_key_path),
    )

    try:
        source_data = _load_json(source)
        if target.is_file():
            target_data = _load_json(target)
            comparator.compare(source_data, target_data)
        else:
            comparator.error(
                "missing_target",
                "/",
                "Localized target JSON does not exist",
                expected=str(target),
                actual="missing",
            )

        baseline_ids = _load_baseline(args.baseline_report) if args.baseline_report else set()
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(json.dumps({"passed": False, "fatal_error": str(exc)}, ensure_ascii=False, indent=2))
        return 2

    preexisting_errors = [
        issue for issue in comparator.errors if issue["issue_id"] in baseline_ids
    ]
    new_errors = [issue for issue in comparator.errors if issue["issue_id"] not in baseline_ids]
    resolved_baseline_ids = sorted(baseline_ids - {item["issue_id"] for item in comparator.errors})
    report = {
        "passed": not new_errors,
        "mode": "baseline" if args.capture_baseline else "comparison",
        "source": str(source),
        "target": str(target),
        "summary": {
            "errors": len(comparator.errors),
            "new_errors": len(new_errors),
            "preexisting_errors": len(preexisting_errors),
            "warnings": len(comparator.warnings),
            "allowed_differences": comparator.allowed_difference_count,
            "resolved_baseline_errors": len(resolved_baseline_ids),
        },
        "errors": comparator.errors,
        "new_errors": new_errors,
        "preexisting_errors": preexisting_errors,
        "warnings": comparator.warnings,
        "allowed_differences": comparator.allowed_differences,
        "allowed_differences_truncated": (
            comparator.allowed_difference_count - len(comparator.allowed_differences)
        ),
        "resolved_baseline_issue_ids": resolved_baseline_ids,
    }

    if args.capture_baseline:
        try:
            report_path = args.capture_baseline.resolve()
            if report_path in {source, target}:
                raise ValueError("baseline report must not overwrite the source or target JSON")
            _write_report(report_path, report)
        except (OSError, ValueError) as exc:
            print(json.dumps({"passed": False, "fatal_error": str(exc)}, ensure_ascii=False, indent=2))
            return 2

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.capture_baseline:
        return 0
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
