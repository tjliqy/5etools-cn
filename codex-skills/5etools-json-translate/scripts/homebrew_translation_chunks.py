#!/usr/bin/env python3
"""Coordinate resumable, terminology-consistent chunks for one large homebrew JSON."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import sqlite3
import subprocess
import sys
import time
import uuid
from collections import Counter
from pathlib import Path

import homebrew_translation_queue as queue


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def emit(payload: dict, code: int = 0) -> int:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return code


def connect(database: Path) -> sqlite3.Connection:
    connection = queue.connect(database)
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS translation_parents (
            source_path TEXT PRIMARY KEY,
            source_hash TEXT NOT NULL,
            status TEXT NOT NULL,
            glossary_version INTEGER NOT NULL DEFAULT 0,
            worktree_path TEXT NOT NULL,
            branch TEXT NOT NULL,
            base_commit TEXT NOT NULL,
            checkpoint_commit TEXT NOT NULL,
            target_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(source_path) REFERENCES tasks(source_path)
        );
        CREATE TABLE IF NOT EXISTS translation_chunks (
            source_path TEXT NOT NULL,
            chunk_id TEXT NOT NULL,
            ordinal INTEGER NOT NULL,
            pointers_json TEXT NOT NULL,
            char_count INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            worker_id TEXT,
            lease_id TEXT,
            lease_expires_at TEXT,
            lease_started_at TEXT,
            lease_hard_expires_at TEXT,
            glossary_version INTEGER,
            commit_sha TEXT,
            report_json TEXT,
            last_error TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(source_path, chunk_id),
            FOREIGN KEY(source_path) REFERENCES translation_parents(source_path)
        );
        CREATE TABLE IF NOT EXISTS translation_terms (
            source_path TEXT NOT NULL,
            english TEXT NOT NULL,
            sense TEXT NOT NULL,
            chinese TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            version INTEGER NOT NULL DEFAULT 0,
            evidence_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL,
            PRIMARY KEY(source_path, english, sense),
            FOREIGN KEY(source_path) REFERENCES translation_parents(source_path)
        );
        CREATE TABLE IF NOT EXISTS translation_term_usage (
            source_path TEXT NOT NULL,
            chunk_id TEXT NOT NULL,
            english TEXT NOT NULL,
            sense TEXT NOT NULL,
            chinese TEXT NOT NULL,
            paths_json TEXT NOT NULL,
            glossary_version INTEGER NOT NULL,
            PRIMARY KEY(source_path, chunk_id, english, sense),
            FOREIGN KEY(source_path, chunk_id) REFERENCES translation_chunks(source_path, chunk_id)
        );
        CREATE TABLE IF NOT EXISTS translation_term_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            chunk_id TEXT NOT NULL,
            english TEXT NOT NULL,
            sense TEXT NOT NULL,
            chinese TEXT NOT NULL,
            reason TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS translation_term_collision_allowances (
            source_path TEXT NOT NULL,
            chinese TEXT NOT NULL,
            rationale TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(source_path, chinese)
        );
        """
    )
    chunk_columns = {row[1] for row in connection.execute("PRAGMA table_info(translation_chunks)")}
    for name in ("lease_started_at", "lease_hard_expires_at"):
        if name not in chunk_columns:
            connection.execute(f"ALTER TABLE translation_chunks ADD COLUMN {name} TEXT")
    return connection


def pointer_escape(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def serialized_size(value) -> int:
    return len(json.dumps(value, ensure_ascii=False, separators=(",", ":")))


def build_chunks(data: dict, max_chars: int) -> list[dict]:
    units = []
    for key, value in data.items():
        base = f"/{pointer_escape(key)}"
        if isinstance(value, list) and value:
            for index, item in enumerate(value):
                units.append((f"{base}/{index}", serialized_size(item)))
        else:
            units.append((base, serialized_size(value)))
    chunks, pointers, size = [], [], 0
    for pointer, unit_size in units:
        if pointers and size + unit_size > max_chars:
            chunks.append({"pointers": pointers, "char_count": size})
            pointers, size = [], 0
        pointers.append(pointer)
        size += unit_size
    if pointers:
        chunks.append({"pointers": pointers, "char_count": size})
    for ordinal, chunk in enumerate(chunks, 1):
        chunk["chunk_id"] = f"chunk-{ordinal:04d}"
        chunk["ordinal"] = ordinal
    return chunks


def collect_name_terms(data: dict) -> list[tuple[str, str, list[str]]]:
    found: dict[tuple[str, str], list[str]] = {}

    def visit(value, pointer: str, sense: str) -> None:
        if isinstance(value, dict):
            name = value.get("name")
            if isinstance(name, str) and name.strip():
                found.setdefault((name.strip(), sense), []).append(pointer + "/name")
            for key, child in value.items():
                visit(child, pointer + "/" + pointer_escape(str(key)), sense)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, f"{pointer}/{index}", sense)

    for key, value in data.items():
        visit(value, "/" + pointer_escape(key), key)
    return [(english, sense, paths) for (english, sense), paths in found.items() if len(paths) > 1]


def git(repo: Path, *args: str, check: bool = True) -> str:
    result = subprocess.run(["git", "-C", str(repo), *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def command_plan(args) -> int:
    source_root = args.source_root.resolve()
    target_repo = args.target_repo.resolve()
    source_path = Path(args.source_path).as_posix()
    source = source_root / source_path
    if not source.is_file():
        return emit({"ok": False, "error": f"source not found: {source}"}, 2)
    data = json.loads(source.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict):
        return emit({"ok": False, "error": "source root must be a JSON object"}, 2)
    source_hash = queue.hash_file(source)
    connection = connect(args.database)
    task = connection.execute("SELECT * FROM tasks WHERE source_path = ?", (source_path,)).fetchone()
    if task is None:
        return emit({"ok": False, "error": "source is not in the queue; run sync first"}, 2)
    if task["source_hash"] != source_hash:
        return emit({"ok": False, "error": "queued source hash is stale; run sync first"}, 2)
    if task["status"] not in {"pending", "failed", "blocked", "needs_chunking"}:
        return emit({"ok": False, "error": f"task status cannot be chunked: {task['status']}"}, 2)
    parents = queue.unfinished_dependencies(connection, source_path, source_root, target_repo)
    if parents:
        connection.execute("BEGIN IMMEDIATE")
        queue.raise_dependency_priorities(connection, source_path, parents)
        connection.execute("COMMIT")
        return emit({"ok": True, "status": "waiting_dependencies", "dependencies": parents}, 3)
    if connection.execute("SELECT 1 FROM translation_parents WHERE source_path = ?", (source_path,)).fetchone():
        return emit({"ok": False, "error": "chunk plan already exists"}, 2)
    chunks = build_chunks(data, args.max_chunk_chars)
    parent_id = hashlib.sha256(f"{source_path}\0{source_hash}".encode()).hexdigest()[:12]
    branch = f"auto-translate-parent/{parent_id}"
    worktree = args.worktree_root.resolve() / f"parent-{parent_id}"
    if worktree.exists():
        return emit({"ok": False, "error": f"worktree already exists: {worktree}"}, 2)
    args.worktree_root.resolve().mkdir(parents=True, exist_ok=True)
    git(target_repo, "worktree", "add", "-b", branch, str(worktree), args.base_ref)
    try:
        base = git(worktree, "rev-parse", "HEAD")
        initial_target = queue.find_existing_target(source, source_path, worktree)
        stamp = now()
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            """INSERT INTO translation_parents
               (source_path, source_hash, status, worktree_path, branch, base_commit,
                checkpoint_commit, target_path, created_at, updated_at)
               VALUES (?, ?, 'translating', ?, ?, ?, ?, ?, ?, ?)""",
            (source_path, source_hash, str(worktree), branch, base, base, initial_target, stamp, stamp),
        )
        for chunk in chunks:
            connection.execute(
                """INSERT INTO translation_chunks
                   (source_path, chunk_id, ordinal, pointers_json, char_count, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (source_path, chunk["chunk_id"], chunk["ordinal"],
                 json.dumps(chunk["pointers"], ensure_ascii=False), chunk["char_count"], stamp),
            )
        terms = collect_name_terms(data)
        for english, sense, paths in terms:
            connection.execute(
                """INSERT INTO translation_terms
                   (source_path, english, sense, evidence_json, updated_at) VALUES (?, ?, ?, ?, ?)""",
                (source_path, english, sense, json.dumps(paths, ensure_ascii=False), stamp),
            )
        connection.execute(
            """UPDATE tasks SET status = 'chunked', attempts = 0, worker_id = NULL, lease_id = NULL,
               lease_expires_at = NULL, worktree_path = ?, branch = ?, claim_base_commit = ?,
               initial_target_path = ?, last_error = NULL, updated_at = ? WHERE source_path = ?""",
            (str(worktree), branch, base, initial_target, stamp, source_path),
        )
        queue.event(connection, source_path, "chunk_plan_created", {
            "chunks": len(chunks), "terms": len(terms), "max_chunk_chars": args.max_chunk_chars,
        })
        connection.execute("COMMIT")
    except Exception:
        connection.execute("ROLLBACK")
        queue.cleanup_worktree(target_repo, str(worktree), branch)
        raise
    return emit({
        "ok": True, "source_path": source_path, "source_hash": source_hash,
        "status": "chunked", "chunks": len(chunks), "pending_terms": len(terms),
        "worktree": str(worktree), "branch": branch,
    })


def command_set_term(args) -> int:
    connection = connect(args.database)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (args.source_path,)).fetchone()
    if parent is None:
        return emit({"ok": False, "error": "parent task not found"}, 2)
    connection.execute("BEGIN IMMEDIATE")
    version = parent["glossary_version"] + 1
    connection.execute(
        """INSERT INTO translation_terms
           (source_path, english, sense, chinese, status, version, evidence_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, '[]', ?)
           ON CONFLICT(source_path, english, sense) DO UPDATE SET
             chinese = excluded.chinese, status = excluded.status,
             version = excluded.version, updated_at = excluded.updated_at""",
        (args.source_path, args.english, args.sense, args.chinese, args.status, version, now()),
    )
    connection.execute(
        "UPDATE translation_parents SET glossary_version = ?, updated_at = ? WHERE source_path = ?",
        (version, now(), args.source_path),
    )
    connection.execute(
        """UPDATE translation_term_proposals SET status = 'resolved'
           WHERE source_path = ? AND english = ? AND sense = ? AND status = 'pending'""",
        (args.source_path, args.english, args.sense),
    )
    connection.execute(
        """UPDATE translation_chunks SET status = 'stale', updated_at = ?
           WHERE source_path = ? AND status = 'complete' AND EXISTS (
             SELECT 1 FROM translation_term_usage u WHERE u.source_path = translation_chunks.source_path
             AND u.chunk_id = translation_chunks.chunk_id AND u.english = ? AND u.sense = ?
             AND u.chinese != ?)""",
        (now(), args.source_path, args.english, args.sense, args.chinese),
    )
    source = args.source_root.resolve() / args.source_path
    if source.is_file():
        source_data = json.loads(source.read_text(encoding="utf-8-sig"))
        for chunk in connection.execute(
            "SELECT chunk_id, pointers_json FROM translation_chunks WHERE source_path = ? AND status = 'complete'",
            (args.source_path,),
        ).fetchall():
            scoped_text = "\n".join(
                json.dumps(pointer_value(source_data, pointer), ensure_ascii=False)
                for pointer in json.loads(chunk["pointers_json"])
            )
            if args.english not in scoped_text:
                continue
            usage = connection.execute(
                """SELECT chinese FROM translation_term_usage
                   WHERE source_path = ? AND chunk_id = ? AND english = ? AND sense = ?""",
                (args.source_path, chunk["chunk_id"], args.english, args.sense),
            ).fetchone()
            if usage is None or usage["chinese"] != args.chinese:
                connection.execute(
                    "UPDATE translation_chunks SET status = 'stale', updated_at = ? WHERE source_path = ? AND chunk_id = ?",
                    (now(), args.source_path, chunk["chunk_id"]),
                )
    connection.execute("COMMIT")
    return emit({"ok": True, "source_path": args.source_path, "glossary_version": version})


def glossary_payload(connection: sqlite3.Connection, source_path: str) -> list[dict]:
    return [dict(row) for row in connection.execute(
        """SELECT english, sense, chinese, status, version, evidence_json
           FROM translation_terms WHERE source_path = ? ORDER BY sense, english""", (source_path,),
    )]


def command_allow_collision(args) -> int:
    connection = connect(args.database)
    if not args.rationale.strip():
        return emit({"ok": False, "error": "a non-empty rationale is required"}, 2)
    connection.execute(
        """INSERT INTO translation_term_collision_allowances (source_path, chinese, rationale, updated_at)
           VALUES (?, ?, ?, ?) ON CONFLICT(source_path, chinese) DO UPDATE SET
           rationale = excluded.rationale, updated_at = excluded.updated_at""",
        (args.source_path, args.chinese, args.rationale.strip(), now()),
    )
    return emit({"ok": True, "source_path": args.source_path, "chinese": args.chinese})


def command_claim_chunk(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (args.source_path,)).fetchone()
    if parent is None or parent["status"] != "translating":
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "active parent task not found"}, 2)
    parents = queue.unfinished_dependencies(connection, args.source_path, args.source_root.resolve(), args.target_repo.resolve())
    if parents:
        queue.raise_dependency_priorities(connection, args.source_path, parents)
        connection.execute("COMMIT")
        return emit({"ok": True, "status": "waiting_dependencies", "dependencies": parents}, 3)
    source = args.source_root.resolve() / args.source_path
    if not source.is_file() or queue.hash_file(source) != parent["source_hash"]:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "source changed during chunked translation"}, 2)
    active = connection.execute(
        "SELECT chunk_id FROM translation_chunks WHERE source_path = ? AND status = 'leased'", (args.source_path,),
    ).fetchone()
    if active:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": f"chunk already leased: {active['chunk_id']}"}, 2)
    chunk = connection.execute(
        """SELECT * FROM translation_chunks WHERE source_path = ? AND status IN ('pending', 'failed', 'stale')
           ORDER BY CASE status WHEN 'stale' THEN 0 ELSE 1 END, ordinal LIMIT 1""", (args.source_path,),
    ).fetchone()
    if chunk is None:
        connection.execute("COMMIT")
        return emit({"ok": True, "status": "empty", "message": "NO_PENDING_CHUNK"}, 3)
    lease_id = uuid.uuid4().hex
    current_time = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    expires = current_time + dt.timedelta(minutes=args.lease_minutes)
    hard_expires = current_time + dt.timedelta(hours=args.max_lease_hours)
    connection.execute(
        """UPDATE translation_chunks SET status = 'leased', worker_id = ?, lease_id = ?,
           lease_expires_at = ?, lease_started_at = ?, lease_hard_expires_at = ?,
           glossary_version = ?, last_error = NULL, updated_at = ?
           WHERE source_path = ? AND chunk_id = ?""",
        (args.worker_id, lease_id, expires.isoformat(), current_time.isoformat(), hard_expires.isoformat(),
         parent["glossary_version"], now(),
         args.source_path, chunk["chunk_id"]),
    )
    connection.execute("COMMIT")
    return emit({
        "ok": True, "status": "leased", "source_path": args.source_path,
        "source": str(args.source_root.resolve() / args.source_path),
        "source_hash": parent["source_hash"], "chunk_id": chunk["chunk_id"],
        "pointers": json.loads(chunk["pointers_json"]), "char_count": chunk["char_count"],
        "lease_id": lease_id, "lease_expires_at": expires.isoformat(),
        "lease_hard_expires_at": hard_expires.isoformat(),
        "worktree": parent["worktree_path"], "target": parent["target_path"],
        "checkpoint_commit": parent["checkpoint_commit"],
        "glossary_version": parent["glossary_version"],
        "glossary": glossary_payload(connection, args.source_path),
    })


def command_chunk_heartbeat(args) -> int:
    connection = connect(args.database)
    current_time = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    row = connection.execute(
        "SELECT lease_hard_expires_at FROM translation_chunks WHERE lease_id = ? AND status = 'leased'",
        (args.lease_id,),
    ).fetchone()
    if row is None:
        return emit({"ok": False, "error": "active chunk lease not found"}, 2)
    requested = current_time + dt.timedelta(minutes=args.lease_minutes)
    hard_expires = dt.datetime.fromisoformat(row["lease_hard_expires_at"]) if row["lease_hard_expires_at"] else requested
    expires = min(requested, hard_expires)
    if expires <= current_time:
        return emit({"ok": False, "error": "hard chunk lease limit reached"}, 2)
    connection.execute("BEGIN IMMEDIATE")
    updated = connection.execute(
        """UPDATE translation_chunks SET lease_expires_at = ?, updated_at = ?
           WHERE lease_id = ? AND status = 'leased' AND lease_expires_at > ?""",
        (expires.isoformat(), now(), args.lease_id, now()),
    )
    if updated.rowcount != 1:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "active chunk lease not found"}, 2)
    connection.execute("COMMIT")
    return emit({"ok": True, "lease_id": args.lease_id, "lease_expires_at": expires.isoformat()})


def command_resume_chunk(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    chunk = connection.execute(
        "SELECT * FROM translation_chunks WHERE lease_id = ? AND status = 'leased'", (args.lease_id,),
    ).fetchone()
    if chunk is None:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "chunk lease not found or already reclaimed"}, 2)
    if chunk["worker_id"] != args.worker_id:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "worker_id does not own this chunk lease"}, 2)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (chunk["source_path"],)).fetchone()
    source = args.source_root.resolve() / chunk["source_path"]
    errors = []
    if not source.is_file() or queue.hash_file(source) != parent["source_hash"]:
        errors.append("source is missing or changed")
    worktree = Path(parent["worktree_path"])
    if not worktree.is_dir():
        errors.append("parent worktree is missing")
    elif git(worktree, "rev-parse", "HEAD") != parent["checkpoint_commit"]:
        # A completed but unregistered chunk commit is also recoverable.
        if subprocess.run(
            ["git", "-C", str(worktree), "merge-base", "--is-ancestor", parent["checkpoint_commit"], "HEAD"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        ).returncode:
            errors.append("worktree HEAD does not descend from the recorded checkpoint")
    if errors:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "errors": errors}, 2)
    current_time = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    expires = current_time + dt.timedelta(minutes=args.lease_minutes)
    hard_expires = current_time + dt.timedelta(hours=args.max_lease_hours)
    connection.execute(
        """UPDATE translation_chunks SET lease_expires_at = ?, lease_started_at = ?,
           lease_hard_expires_at = ?, updated_at = ? WHERE lease_id = ? AND status = 'leased'""",
        (expires.isoformat(), current_time.isoformat(), hard_expires.isoformat(), now(), args.lease_id),
    )
    connection.execute("COMMIT")
    return emit({
        "ok": True, "status": "leased", "lease_id": args.lease_id,
        "lease_expires_at": expires.isoformat(), "lease_hard_expires_at": hard_expires.isoformat(),
    })


def command_fail_chunk(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    updated = connection.execute(
        """UPDATE translation_chunks SET status = 'failed', lease_id = NULL, lease_expires_at = NULL,
           last_error = ?, updated_at = ? WHERE lease_id = ? AND status = 'leased'""",
        (args.reason, now(), args.lease_id),
    )
    if updated.rowcount != 1:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "chunk lease not found"}, 2)
    connection.execute("COMMIT")
    return emit({"ok": True, "status": "failed", "lease_id": args.lease_id})


def command_reclaim_chunks(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    rows = connection.execute(
        "SELECT source_path, chunk_id, lease_id FROM translation_chunks WHERE status = 'leased' AND lease_expires_at <= ?",
        (now(),),
    ).fetchall()
    for row in rows:
        connection.execute(
            """UPDATE translation_chunks SET status = 'failed', lease_id = NULL, lease_expires_at = NULL,
               last_error = 'chunk lease expired', updated_at = ?
               WHERE source_path = ? AND chunk_id = ? AND lease_id = ?""",
            (now(), row["source_path"], row["chunk_id"], row["lease_id"]),
        )
    connection.execute("COMMIT")
    return emit({"ok": True, "reclaimed": len(rows), "chunks": [dict(row) for row in rows]})


def command_chunk_keepalive(args) -> int:
    while True:
        connection = connect(args.database)
        row = connection.execute(
            "SELECT status FROM translation_chunks WHERE lease_id = ?", (args.lease_id,),
        ).fetchone()
        connection.close()
        if row is None or row["status"] != "leased":
            return emit({"ok": True, "status": "stopped", "reason": "chunk lease no longer active"})
        time.sleep(max(1, args.interval_seconds))
        heartbeat_args = argparse.Namespace(database=args.database, lease_id=args.lease_id, lease_minutes=args.lease_minutes)
        result = command_chunk_heartbeat(heartbeat_args)
        if result:
            return result


def pointer_is_allowed(path: str, allowed: list[str]) -> bool:
    return any(path == prefix or path.startswith(prefix + "/") for prefix in allowed)


def json_diff_paths(before, after, pointer="") -> set[str]:
    if type(before) is not type(after):
        return {pointer or "/"}
    if isinstance(before, dict):
        changed = set()
        for key in before.keys() | after.keys():
            child = pointer + "/" + pointer_escape(str(key))
            if key not in before or key not in after:
                changed.add(child)
            else:
                changed |= json_diff_paths(before[key], after[key], child)
        return changed
    if isinstance(before, list):
        changed = set()
        for index in range(max(len(before), len(after))):
            child = f"{pointer}/{index}"
            if index >= len(before) or index >= len(after):
                changed.add(child)
            else:
                changed |= json_diff_paths(before[index], after[index], child)
        return changed
    return set() if before == after else {pointer or "/"}


def pointer_value(data, pointer: str):
    current = data
    for raw in pointer.lstrip("/").split("/") if pointer != "/" else []:
        part = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def command_complete_chunk(args) -> int:
    report = json.loads(args.result.read_text(encoding="utf-8"))
    connection = connect(args.database)
    chunk = connection.execute(
        "SELECT * FROM translation_chunks WHERE lease_id = ? AND status = 'leased'", (args.lease_id,),
    ).fetchone()
    if chunk is None or chunk["lease_expires_at"] <= now():
        return emit({"ok": False, "error": "active chunk lease not found"}, 2)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (chunk["source_path"],)).fetchone()
    errors = []
    if report.get("review", {}).get("result") != "PASS":
        errors.append("review.result must be PASS")
    if report.get("glossary_version") != parent["glossary_version"]:
        errors.append("chunk must use the current glossary version")
    worktree = Path(parent["worktree_path"])
    commit = report.get("commit_sha", "")
    target_path = report.get("target") or parent["target_path"]
    target = (worktree / target_path).resolve() if target_path else None
    if target is not None:
        try:
            target.relative_to(worktree.resolve())
        except ValueError:
            errors.append("target is outside the parent worktree")
        else:
            source = args.source_root.resolve() / chunk["source_path"]
            if target.is_file():
                errors.extend(queue.validate_target_identity(source, target, chunk["source_path"], target.relative_to(worktree.resolve()).as_posix()))
    if not commit or git(worktree, "rev-parse", "HEAD") != commit:
        errors.append("commit_sha must be the parent worktree HEAD")
    else:
        parents = git(worktree, "rev-list", "--parents", "-n", "1", commit).split()
        if len(parents) != 2 or parents[1] != parent["checkpoint_commit"]:
            errors.append("chunk must produce exactly one commit on the previous checkpoint")
        entries = queue.commit_paths(worktree, commit)
        if not target_path:
            errors.append("target is required")
        elif any(entry[0] not in {"A", "M", "R100"} or target_path not in entry[1:] for entry in entries):
            errors.append("chunk commit must contain only the selected target JSON")
        elif parent["target_path"]:
            try:
                before = json.loads(git(worktree, "show", f"{parent['checkpoint_commit']}:{parent['target_path']}") or "null")
                after = json.loads((worktree / target_path).read_text(encoding="utf-8-sig"))
                changed = json_diff_paths(before, after)
                allowed = json.loads(chunk["pointers_json"])
                outside = sorted(path for path in changed if not pointer_is_allowed(path, allowed))
                if outside:
                    errors.append("chunk changed paths outside its scope: " + ", ".join(outside[:10]))
            except (OSError, json.JSONDecodeError, RuntimeError) as exc:
                errors.append(f"could not verify chunk JSON scope: {exc}")
    usage = report.get("term_usage", [])
    usage_keys = {(item.get("english"), item.get("sense")) for item in usage}
    source_data = json.loads((args.source_root.resolve() / chunk["source_path"]).read_text(encoding="utf-8-sig"))
    chunk_pointers = json.loads(chunk["pointers_json"])
    scoped_text = "\n".join(
        json.dumps(pointer_value(source_data, pointer), ensure_ascii=False) for pointer in chunk_pointers
    )
    for term in connection.execute(
        """SELECT english, sense FROM translation_terms
           WHERE source_path = ? AND status IN ('locked', 'contextual')""", (chunk["source_path"],),
    ):
        sense_pointer = "/" + pointer_escape(term["sense"])
        if term["sense"] in source_data and not any(
            pointer == sense_pointer or pointer.startswith(sense_pointer + "/") for pointer in chunk_pointers
        ):
            continue
        if term["english"] in scoped_text and (term["english"], term["sense"]) not in usage_keys:
            errors.append(f"term usage missing from ledger: {term['english']} ({term['sense']})")
    for item in usage:
        term = connection.execute(
            """SELECT chinese, status FROM translation_terms
               WHERE source_path = ? AND english = ? AND sense = ?""",
            (chunk["source_path"], item.get("english"), item.get("sense")),
        ).fetchone()
        if term and term["status"] == "locked" and term["chinese"] != item.get("chinese"):
            errors.append(f"locked term mismatch: {item.get('english')} ({item.get('sense')})")
    if errors:
        return emit({"ok": False, "errors": errors}, 2)
    connection.execute("BEGIN IMMEDIATE")
    connection.execute(
        """UPDATE translation_parents SET checkpoint_commit = ?, target_path = ?, updated_at = ?
           WHERE source_path = ?""",
        (commit, report.get("target") or parent["target_path"], now(), chunk["source_path"]),
    )
    connection.execute(
        """UPDATE translation_chunks SET status = 'complete', commit_sha = ?, report_json = ?,
           lease_id = NULL, lease_expires_at = NULL, updated_at = ?
           WHERE source_path = ? AND chunk_id = ?""",
        (commit, json.dumps(report, ensure_ascii=False), now(), chunk["source_path"], chunk["chunk_id"]),
    )
    connection.execute("DELETE FROM translation_term_usage WHERE source_path = ? AND chunk_id = ?", (chunk["source_path"], chunk["chunk_id"]))
    for item in usage:
        connection.execute(
            """INSERT INTO translation_term_usage
               (source_path, chunk_id, english, sense, chinese, paths_json, glossary_version)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (chunk["source_path"], chunk["chunk_id"], item["english"], item["sense"], item["chinese"],
             json.dumps(item.get("paths", []), ensure_ascii=False), report["glossary_version"]),
        )
    for proposal in report.get("term_proposals", []):
        connection.execute(
            """INSERT INTO translation_term_proposals
               (source_path, chunk_id, english, sense, chinese, reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (chunk["source_path"], chunk["chunk_id"], proposal["english"], proposal["sense"],
             proposal["chinese"], proposal.get("reason"), now()),
        )
    connection.execute("COMMIT")
    return emit({"ok": True, "status": "complete", "source_path": chunk["source_path"], "chunk_id": chunk["chunk_id"], "commit_sha": commit})


def terminology_errors(connection: sqlite3.Connection, source_path: str) -> list[str]:
    errors = []
    pending_chunks = connection.execute(
        "SELECT chunk_id, status FROM translation_chunks WHERE source_path = ? AND status != 'complete'", (source_path,),
    ).fetchall()
    if pending_chunks:
        errors.append("unfinished chunks: " + ", ".join(f"{r['chunk_id']}={r['status']}" for r in pending_chunks[:20]))
    pending_proposals = connection.execute(
        "SELECT COUNT(*) FROM translation_term_proposals WHERE source_path = ? AND status = 'pending'", (source_path,),
    ).fetchone()[0]
    if pending_proposals:
        errors.append(f"unresolved term proposals: {pending_proposals}")
    pending_terms = connection.execute(
        "SELECT COUNT(*) FROM translation_terms WHERE source_path = ? AND status = 'pending'", (source_path,),
    ).fetchone()[0]
    if pending_terms:
        errors.append(f"unresolved glossary terms: {pending_terms}")
    variants = connection.execute(
        """SELECT english, sense, COUNT(DISTINCT chinese) AS variants
           FROM translation_term_usage WHERE source_path = ? GROUP BY english, sense
           HAVING COUNT(DISTINCT chinese) > 1""", (source_path,),
    ).fetchall()
    errors.extend(f"inconsistent term: {r['english']} ({r['sense']})" for r in variants)
    mismatches = connection.execute(
        """SELECT DISTINCT u.english, u.sense, u.chinese, t.chinese expected
           FROM translation_term_usage u JOIN translation_terms t
           ON t.source_path = u.source_path AND t.english = u.english AND t.sense = u.sense
           WHERE u.source_path = ? AND t.status = 'locked' AND u.chinese != t.chinese""", (source_path,),
    ).fetchall()
    errors.extend(f"locked mismatch: {r['english']} ({r['sense']}): {r['chinese']} != {r['expected']}" for r in mismatches)
    collisions = connection.execute(
        """SELECT chinese, COUNT(DISTINCT english || char(0) || sense) AS meanings
           FROM translation_term_usage WHERE source_path = ? GROUP BY chinese
           HAVING COUNT(DISTINCT english || char(0) || sense) > 1
           AND chinese NOT IN (SELECT chinese FROM translation_term_collision_allowances WHERE source_path = ?)""",
        (source_path, source_path),
    ).fetchall()
    errors.extend(f"Chinese term collision requires review: {r['chinese']} ({r['meanings']} meanings)" for r in collisions)
    return errors


def command_audit(args) -> int:
    connection = connect(args.database)
    errors = terminology_errors(connection, args.source_path)
    return emit({"ok": not errors, "source_path": args.source_path, "result": "PASS" if not errors else "FAIL", "errors": errors}, 0 if not errors else 2)


def command_finalize(args) -> int:
    report = json.loads(args.result.read_text(encoding="utf-8"))
    connection = connect(args.database)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (args.source_path,)).fetchone()
    if parent is None or parent["status"] != "translating":
        return emit({"ok": False, "error": "active parent task not found"}, 2)
    errors = terminology_errors(connection, args.source_path)
    if report.get("terminology", {}).get("result") != "PASS":
        errors.append("terminology.result must be PASS")
    errors.extend(queue.require_report(report))
    if report.get("source_hash") != parent["source_hash"]:
        errors.append("report source_hash does not match the parent source")
    source = args.source_root.resolve() / args.source_path
    if not source.is_file() or queue.hash_file(source) != parent["source_hash"]:
        errors.append("source changed during chunked translation")
    worktree = Path(parent["worktree_path"])
    target_path = report.get("target") or parent["target_path"]
    if not target_path or not (worktree / target_path).is_file():
        errors.append("final target does not exist")
    elif target_path != parent["target_path"]:
        errors.append("final report target does not match the parent target")
    else:
        errors.extend(queue.validate_target_identity(source, worktree / target_path, args.source_path, target_path))
    if queue.non_generated_changes(worktree):
        errors.append("parent worktree has non-generated uncommitted changes")
    if errors:
        return emit({"ok": False, "errors": errors}, 2)
    git(worktree, "reset", "--soft", parent["base_commit"])
    commit = git(
        worktree, "-c", "user.email=homebrew-worker@example.invalid", "-c", "user.name=Homebrew Translation Worker",
        "commit", "-m", f"translate: {args.source_path}",
    )
    del commit
    final_commit = git(worktree, "rev-parse", "HEAD")
    entries = queue.commit_paths(worktree, final_commit)
    task = connection.execute("SELECT initial_target_path FROM tasks WHERE source_path = ?", (args.source_path,)).fetchone()
    scope_errors = queue.validate_commit_scope(entries, task["initial_target_path"] if task else None, target_path)
    if scope_errors:
        return emit({"ok": False, "errors": scope_errors, "recovery": "parent worktree remains available"}, 2)
    report["commit_sha"] = final_commit
    connection.execute("BEGIN IMMEDIATE")
    connection.execute(
        "UPDATE translation_parents SET status = 'ready', checkpoint_commit = ?, updated_at = ? WHERE source_path = ?",
        (final_commit, now(), args.source_path),
    )
    connection.execute(
        """UPDATE tasks SET status = 'ready', target_path = ?, commit_sha = ?, report_json = ?,
           lease_id = NULL, lease_expires_at = NULL, updated_at = ? WHERE source_path = ?""",
        (target_path, final_commit, json.dumps(report, ensure_ascii=False), now(), args.source_path),
    )
    queue.event(connection, args.source_path, "chunk_parent_ready", {"commit_sha": final_commit, "target_path": target_path})
    connection.execute("COMMIT")
    return emit({"ok": True, "status": "ready", "source_path": args.source_path, "target_path": target_path, "commit_sha": final_commit})


def command_status(args) -> int:
    connection = connect(args.database)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (args.source_path,)).fetchone()
    if parent is None:
        return emit({"ok": False, "error": "parent task not found"}, 2)
    counts = {r[0]: r[1] for r in connection.execute(
        "SELECT status, COUNT(*) FROM translation_chunks WHERE source_path = ? GROUP BY status", (args.source_path,),
    )}
    pending_terms = connection.execute(
        "SELECT COUNT(*) FROM translation_terms WHERE source_path = ? AND status = 'pending'", (args.source_path,),
    ).fetchone()[0]
    pending_proposals = connection.execute(
        "SELECT COUNT(*) FROM translation_term_proposals WHERE source_path = ? AND status = 'pending'", (args.source_path,),
    ).fetchone()[0]
    return emit({"ok": True, "parent": dict(parent), "chunks": counts, "pending_terms": pending_terms, "pending_proposals": pending_proposals})


def command_abort_parent(args) -> int:
    connection = connect(args.database)
    parent = connection.execute("SELECT * FROM translation_parents WHERE source_path = ?", (args.source_path,)).fetchone()
    if parent is None:
        return emit({"ok": False, "error": "parent task not found"}, 2)
    active = connection.execute(
        "SELECT chunk_id FROM translation_chunks WHERE source_path = ? AND status = 'leased'", (args.source_path,),
    ).fetchone()
    if active:
        return emit({"ok": False, "error": f"cannot abort while chunk is leased: {active['chunk_id']}"}, 2)
    source = args.source_root.resolve() / args.source_path
    live_hash = queue.hash_file(source) if source.is_file() else parent["source_hash"]
    next_status = "needs_chunking" if source.is_file() else "obsolete"
    cleanup_errors = queue.cleanup_worktree(args.target_repo.resolve(), parent["worktree_path"], parent["branch"])
    if cleanup_errors:
        return emit({"ok": False, "error": "parent worktree cleanup failed", "cleanup_errors": cleanup_errors}, 2)
    connection.execute("BEGIN IMMEDIATE")
    connection.execute("DELETE FROM translation_term_usage WHERE source_path = ?", (args.source_path,))
    connection.execute("DELETE FROM translation_term_proposals WHERE source_path = ?", (args.source_path,))
    connection.execute("DELETE FROM translation_term_collision_allowances WHERE source_path = ?", (args.source_path,))
    connection.execute("DELETE FROM translation_chunks WHERE source_path = ?", (args.source_path,))
    connection.execute("DELETE FROM translation_terms WHERE source_path = ?", (args.source_path,))
    connection.execute("DELETE FROM translation_parents WHERE source_path = ?", (args.source_path,))
    connection.execute(
        """UPDATE tasks SET source_hash = ?, status = ?, attempts = 0, worker_id = NULL,
           lease_id = NULL, lease_expires_at = NULL, lease_started_at = NULL,
           lease_hard_expires_at = NULL, target_path = NULL, worktree_path = NULL,
           branch = NULL, commit_sha = NULL, report_json = NULL, initial_target_path = NULL,
           claim_base_commit = NULL, last_error = ?, updated_at = ? WHERE source_path = ?""",
        (live_hash, next_status, args.reason, now(), args.source_path),
    )
    queue.event(connection, args.source_path, "chunk_parent_aborted", {"reason": args.reason, "next_status": next_status})
    connection.execute("COMMIT")
    return emit({"ok": True, "source_path": args.source_path, "status": next_status})


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--database", type=Path, default=queue.DEFAULT_STATE_DIR / "queue.sqlite3")
    result.add_argument("--source-root", type=Path, default=queue.DEFAULT_SOURCE_ROOT)
    result.add_argument("--target-repo", type=Path, default=queue.DEFAULT_TARGET_REPO)
    result.add_argument("--worktree-root", type=Path, default=queue.DEFAULT_WORKTREE_ROOT)
    commands = result.add_subparsers(dest="command", required=True)
    plan = commands.add_parser("plan")
    plan.add_argument("--source-path", required=True)
    plan.add_argument("--max-chunk-chars", type=int, default=80000)
    plan.add_argument("--base-ref", default="HEAD")
    plan.set_defaults(func=command_plan)
    set_term = commands.add_parser("set-term")
    set_term.add_argument("--source-path", required=True)
    set_term.add_argument("--english", required=True)
    set_term.add_argument("--sense", required=True)
    set_term.add_argument("--chinese", required=True)
    set_term.add_argument("--status", choices=("locked", "contextual"), default="locked")
    set_term.set_defaults(func=command_set_term)
    allow_collision = commands.add_parser("allow-collision")
    allow_collision.add_argument("--source-path", required=True)
    allow_collision.add_argument("--chinese", required=True)
    allow_collision.add_argument("--rationale", required=True)
    allow_collision.set_defaults(func=command_allow_collision)
    claim = commands.add_parser("claim-chunk")
    claim.add_argument("--source-path", required=True)
    claim.add_argument("--worker-id", required=True)
    claim.add_argument("--lease-minutes", type=int, default=30)
    claim.add_argument("--max-lease-hours", type=int, default=12)
    claim.set_defaults(func=command_claim_chunk)
    heartbeat = commands.add_parser("heartbeat")
    heartbeat.add_argument("--lease-id", required=True)
    heartbeat.add_argument("--lease-minutes", type=int, default=30)
    heartbeat.set_defaults(func=command_chunk_heartbeat)
    resume = commands.add_parser("resume-chunk")
    resume.add_argument("--lease-id", required=True)
    resume.add_argument("--worker-id", required=True)
    resume.add_argument("--lease-minutes", type=int, default=30)
    resume.add_argument("--max-lease-hours", type=int, default=12)
    resume.set_defaults(func=command_resume_chunk)
    fail = commands.add_parser("fail-chunk")
    fail.add_argument("--lease-id", required=True)
    fail.add_argument("--reason", required=True)
    fail.set_defaults(func=command_fail_chunk)
    reclaim = commands.add_parser("reclaim-expired")
    reclaim.set_defaults(func=command_reclaim_chunks)
    keepalive = commands.add_parser("keepalive")
    keepalive.add_argument("--lease-id", required=True)
    keepalive.add_argument("--interval-seconds", type=int, default=300)
    keepalive.add_argument("--lease-minutes", type=int, default=30)
    keepalive.set_defaults(func=command_chunk_keepalive)
    complete = commands.add_parser("complete-chunk")
    complete.add_argument("--lease-id", required=True)
    complete.add_argument("--result", type=Path, required=True)
    complete.set_defaults(func=command_complete_chunk)
    audit = commands.add_parser("audit-terminology")
    audit.add_argument("--source-path", required=True)
    audit.set_defaults(func=command_audit)
    finalize = commands.add_parser("finalize")
    finalize.add_argument("--source-path", required=True)
    finalize.add_argument("--result", type=Path, required=True)
    finalize.set_defaults(func=command_finalize)
    status = commands.add_parser("status")
    status.add_argument("--source-path", required=True)
    status.set_defaults(func=command_status)
    abort = commands.add_parser("abort-parent")
    abort.add_argument("--source-path", required=True)
    abort.add_argument("--reason", required=True)
    abort.set_defaults(func=command_abort_parent)
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        return args.func(args)
    except (OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as exc:
        return emit({"ok": False, "error": str(exc)}, 2)


if __name__ == "__main__":
    raise SystemExit(main())
