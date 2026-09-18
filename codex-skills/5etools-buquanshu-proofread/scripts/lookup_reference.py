#!/usr/bin/env python3
"""Read-only wrapper around 5e-translator terminology and entity references."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--translator-root", default=os.environ.get("FIVE_E_TRANSLATOR_ROOT", "/data/5e-translator"))
    modes = parser.add_subparsers(dest="mode", required=True)

    translations = modes.add_parser("translations")
    translations.add_argument("queries", nargs="+")
    translations.add_argument("--category")
    translations.add_argument("--entity-id")
    translations.add_argument("--limit", type=int, default=5)
    translations.add_argument("--reference", action="append", default=[])

    entities = modes.add_parser("entities")
    entities.add_argument("queries", nargs="+")
    entities.add_argument("--entity-type")
    entities.add_argument("--limit", type=int, default=3)
    entities.add_argument("--reference", action="append", default=[])
    return parser


def main() -> int:
    args = build_parser().parse_args()
    root = Path(args.translator_root).expanduser().resolve()
    if not (root / "app/core/agent/tools.py").is_file():
        raise SystemExit(f"5e-translator tools not found under: {root}")

    os.chdir(root)
    sys.path.insert(0, str(root))
    from app.core.agent.reference_tools import ReferenceTools

    references = ReferenceTools()
    reference_reports = []
    for raw_path in args.reference:
        path_obj = Path(raw_path).expanduser().resolve()
        if not path_obj.is_file():
            raise SystemExit(f"Reference is not a file: {path_obj}")
        reference_reports.append(references.store.load_path(str(path_obj), [path_obj.parent]))

    if args.mode == "translations":
        result = references.lookup_translations(
            args.queries,
            category=args.category,
            entity_id=args.entity_id,
            limit_per_term=args.limit,
        )
    else:
        result = references.lookup_entities(
            args.queries,
            entity_type=args.entity_type,
            limit_per_name=args.limit,
        )

    json.dump({"reference_reports": reference_reports, "result": result}, sys.stdout, ensure_ascii=False, indent=2, default=str)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
