#!/usr/bin/env python3
"""Run homebrew validation commands independently and compare with a baseline."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path

COMMANDS = (
    "test:file-locations", "test:file-names", "test:file-props",
    "test:img-directories", "test:file-contents", "test:html",
)


def normalized(text: str) -> str:
    text = re.sub(r"Ran in [^\n\r]+", "Ran in <duration>", text)
    text = re.sub(r"Run duration: [^\n\r]+", "Run duration: <duration>", text)
    lines = [
        line for line in text.splitlines()
        if not re.match(r'^\[\s*PROP_CHECK\] Checking dir ".+"\.\.\.$', line)
        and not re.match(r'^Running on directory ".+"\.\.\.$', line)
    ]
    return "\n".join(lines).strip()


def run(root: Path):
    results = []
    for script in COMMANDS:
        completed = subprocess.run(
            ["npm", "run", script], cwd=root, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
        )
        results.append({"script": script, "exit_code": completed.returncode, "output": normalized(completed.stdout)})
    return results


def failed_scripts(results: list[dict]) -> list[str]:
    return [item["script"] for item in results if item["exit_code"] != 0]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--capture-baseline", type=Path)
    group.add_argument("--baseline-report", type=Path)
    parser.add_argument(
        "--allow-failing-baseline", action="store_true",
        help="Diagnostic escape hatch; automated workers and integration must not use this",
    )
    parser.add_argument("--homebrew-dir", type=Path, default=Path(os.environ.get("HOMEBREW_ZH_ROOT", "/data/homebrew")))
    args = parser.parse_args()

    baseline = None
    if args.baseline_report:
        baseline = json.loads(args.baseline_report.read_text(encoding="utf-8"))
        failures = failed_scripts(baseline["results"])
        if failures and not args.allow_failing_baseline:
            print(json.dumps({
                "passed": False,
                "error": "baseline is not clean",
                "baseline_failures": failures,
            }, ensure_ascii=False, indent=2))
            return 1

    results = run(args.homebrew_dir.resolve())
    failures = failed_scripts(results)
    report = {
        "homebrew_dir": str(args.homebrew_dir.resolve()),
        "clean": not failures,
        "failures": failures,
        "results": results,
    }
    if args.capture_baseline:
        args.capture_baseline.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        passed = not failures or args.allow_failing_baseline
        print(json.dumps({"passed": passed, "captured": str(args.capture_baseline), **report}, ensure_ascii=False, indent=2))
        return 0 if passed else 1

    old = {item["script"]: item for item in baseline["results"]}
    regressions = []
    for item in results:
        previous = old.get(item["script"])
        if previous is None or (previous["exit_code"] == 0 and item["exit_code"] != 0):
            regressions.append({"script": item["script"], "reason": "new_failure"})
        elif item["exit_code"] != 0 and item["output"] != previous.get("output"):
            regressions.append({"script": item["script"], "reason": "changed_failure"})
    print(json.dumps({"passed": not regressions, "regressions": regressions, **report}, ensure_ascii=False, indent=2))
    return 0 if not regressions else 1


if __name__ == "__main__":
    raise SystemExit(main())
