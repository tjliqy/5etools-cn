#!/usr/bin/env python3
"""Coordinate concurrent homebrew translation workers with SQLite leases and Git worktrees."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path


DEFAULT_SOURCE_ROOT = Path(os.environ.get("HOMEBREW_EN_ROOT", "/data/homebrew-en"))
DEFAULT_TARGET_REPO = Path(os.environ.get("HOMEBREW_ZH_REPO", "/data/homebrew"))
DEFAULT_STATE_DIR = Path(os.environ.get("HOMEBREW_TRANSLATION_STATE_DIR", "/data/homebrew-translation-state"))
DEFAULT_WORKTREE_ROOT = Path(os.environ.get("HOMEBREW_WORKTREE_ROOT", "/data/homebrew-workers"))
REQUIRED_VALIDATION = ("json", "structure", "schema", "build", "tests")
SCRIPT_DIR = Path(__file__).resolve().parent


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def stamp(value: dt.datetime | None = None) -> str:
    return (value or now()).isoformat()


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def git_ok(repo: Path, *args: str) -> str:
    result = run_git(repo, *args)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def non_generated_changes(repo: Path) -> list[str]:
    return [
        line for line in run_git(repo, "-c", "core.quotepath=false", "status", "--porcelain").stdout.splitlines()
        if line and not line[3:].startswith("_generated/")
    ]


def non_generated_change_paths(repo: Path) -> list[str]:
    paths = set()
    for args in (
        ("diff", "--name-only", "-z"),
        ("diff", "--cached", "--name-only", "-z"),
        ("ls-files", "--others", "--exclude-standard", "-z"),
    ):
        output = git_ok(repo, *args)
        paths.update(path for path in output.split("\0") if path and not path.startswith("_generated/"))
    return sorted(paths)


def absorb_build_target_change(repo: Path, target_path: str) -> bool:
    """Amend build normalization when it changed only the selected target JSON."""
    dirty = non_generated_change_paths(repo)
    if not dirty:
        return False
    if dirty != [target_path]:
        raise RuntimeError("integration build changed non-generated files outside the selected target: " + ", ".join(dirty))
    git_ok(repo, "add", "--", target_path)
    git_ok(
        repo,
        "-c", "user.name=Homebrew Integration",
        "-c", "user.email=homebrew-integration@example.invalid",
        "commit", "--amend", "--no-edit",
    )
    return True


def connect(database: Path) -> sqlite3.Connection:
    database.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database, timeout=30, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            source_path TEXT PRIMARY KEY,
            source_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            priority INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
            worker_id TEXT,
            lease_id TEXT,
            lease_expires_at TEXT,
            retry_after TEXT,
            target_path TEXT,
            worktree_path TEXT,
            branch TEXT,
            commit_sha TEXT,
            last_error TEXT,
            report_json TEXT,
            initial_target_path TEXT,
            integration_commit TEXT,
            integration_token TEXT,
            integration_base TEXT,
            claim_base_commit TEXT,
            lease_started_at TEXT,
            lease_hard_expires_at TEXT,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            event TEXT NOT NULL,
            detail_json TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    columns = {row[1] for row in connection.execute("PRAGMA table_info(tasks)")}
    for name in (
        "initial_target_path", "integration_commit", "integration_token", "integration_base", "claim_base_commit",
        "lease_started_at", "lease_hard_expires_at",
    ):
        if name not in columns:
            connection.execute(f"ALTER TABLE tasks ADD COLUMN {name} TEXT")
    return connection


def event(connection: sqlite3.Connection, source_path: str, name: str, detail: dict | None = None) -> None:
    connection.execute(
        "INSERT INTO events(source_path, event, detail_json, created_at) VALUES (?, ?, ?, ?)",
        (source_path, name, json.dumps(detail or {}, ensure_ascii=False), stamp()),
    )


def emit(payload: dict, status: int = 0) -> int:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return status


def source_files(root: Path) -> list[Path]:
    return sorted(
        path for path in root.rglob("*.json")
        if "_generated" not in path.relative_to(root).parts
    )


def homebrew_identity(path: Path) -> set[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return set()
    sources = data.get("_meta", {}).get("sources", []) if isinstance(data, dict) else []
    return {item["json"] for item in sources if isinstance(item, dict) and isinstance(item.get("json"), str)}


def unfinished_dependencies(
    connection: sqlite3.Connection, source_path: str, source_root: Path, target_repo: Path,
) -> list[str]:
    """Return queued parent paths which must be integrated before this source."""
    source = source_root / source_path
    try:
        data = json.loads(source.read_text(encoding="utf-8-sig"))
        dependencies = data.get("_meta", {}).get("dependencies", {})
        english_index = json.loads((source_root / "_generated/index-sources.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError, AttributeError):
        return []
    if not isinstance(dependencies, dict) or not isinstance(english_index, dict):
        return []
    try:
        translated_index = json.loads((target_repo / "_generated/index-sources.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        translated_index = {}
    if not isinstance(translated_index, dict):
        translated_index = {}
    codes = {code for values in dependencies.values() if isinstance(values, list)
             for code in values if isinstance(code, str) and code not in translated_index}
    paths = {english_index[code] for code in codes if isinstance(english_index.get(code), str)}
    paths.discard(source_path)
    if not paths:
        return []
    rows = connection.execute(
        f"SELECT source_path, status FROM tasks WHERE source_path IN ({','.join('?' for _ in paths)})",
        sorted(paths),
    ).fetchall()
    return sorted(row["source_path"] for row in rows if row["status"] != "merged")


def raise_dependency_priorities(connection: sqlite3.Connection, child: str, parents: list[str]) -> None:
    top = connection.execute("SELECT MAX(priority) AS top FROM tasks").fetchone()["top"] or 0
    for path in parents:
        row = connection.execute("SELECT status, priority FROM tasks WHERE source_path = ?", (path,)).fetchone()
        if row is None or row["status"] not in {"pending", "failed", "needs_chunking", "chunked"}:
            continue
        top += 1
        connection.execute("UPDATE tasks SET priority = ?, retry_after = NULL, updated_at = ? WHERE source_path = ?",
                           (top, stamp(), path))
        event(connection, path, "priority_changed", {
            "mode": "dependency", "priority_before": row["priority"], "priority_after": top,
            "requested_by": child,
        })


def find_existing_target(source: Path, source_relative: str, target_root: Path) -> str | None:
    directory = target_root / Path(source_relative).parent
    identities = homebrew_identity(source)
    if not directory.is_dir() or not identities:
        return None
    matches = [path for path in directory.glob("*.json") if homebrew_identity(path) & identities]
    if len(matches) > 1:
        raise RuntimeError("multiple existing targets share source identity: " + ", ".join(map(str, matches)))
    return matches[0].relative_to(target_root).as_posix() if matches else None


def cleanup_worktree(target_repo: Path, worktree_path: str | None, branch: str | None) -> list[str]:
    errors = []
    if worktree_path and Path(worktree_path).exists():
        result = run_git(target_repo, "worktree", "remove", "--force", worktree_path)
        if result.returncode:
            errors.append(result.stderr.strip() or result.stdout.strip())
    if branch and branch.startswith(("auto-translate/", "auto-integrate/")):
        result = run_git(target_repo, "branch", "-D", branch)
        if result.returncode and "not found" not in result.stderr:
            errors.append(result.stderr.strip() or result.stdout.strip())
    return errors


def cleanup_excess_worktrees(
    target_repo: Path,
    worktree_root: Path,
    connection: sqlite3.Connection,
) -> dict[str, list]:
    """Remove orphaned coordinator worktrees after a successful integration."""
    root = worktree_root.resolve()
    active_paths = {
        Path(row["worktree_path"]).resolve()
        for row in connection.execute(
            """SELECT worktree_path FROM tasks
               WHERE worktree_path IS NOT NULL
               AND status IN ('leased', 'ready', 'integrating', 'chunked', 'reclaiming', 'failing')"""
        )
    }
    result = run_git(target_repo, "worktree", "list", "--porcelain")
    if result.returncode:
        return {"removed": [], "errors": [result.stderr.strip() or result.stdout.strip()]}

    removed: list[str] = []
    errors: list[dict[str, str]] = []
    entries = [block.splitlines() for block in result.stdout.strip().split("\n\n") if block.strip()]
    for lines in entries:
        fields = {line.split(" ", 1)[0]: line.split(" ", 1)[1] for line in lines if " " in line}
        path_text = fields.get("worktree")
        branch_ref = fields.get("branch", "")
        branch_prefix = "refs/heads/"
        branch = branch_ref[len(branch_prefix):] if branch_ref.startswith(branch_prefix) else branch_ref
        if not path_text or not branch.startswith(("auto-translate/", "auto-integrate/")):
            continue
        path = Path(path_text).resolve()
        try:
            path.relative_to(root)
        except ValueError:
            continue
        if path in active_paths:
            continue
        cleanup_errors = cleanup_worktree(target_repo, str(path), branch)
        if cleanup_errors:
            errors.append({"worktree": str(path), "error": "; ".join(cleanup_errors)})
        else:
            removed.append(str(path))
    run_git(target_repo, "worktree", "prune")
    return {"removed": removed, "errors": errors}


def command_sync(args) -> int:
    root = args.source_root.resolve()
    if not root.is_dir():
        return emit({"ok": False, "error": f"source root does not exist: {root}"}, 2)
    connection = connect(args.database)
    seen = set()
    inserted = changed = unchanged = 0
    connection.execute("BEGIN IMMEDIATE")
    try:
        for path in source_files(root):
            relative = path.relative_to(root).as_posix()
            seen.add(relative)
            digest = hash_file(path)
            oversized = args.chunk_threshold_bytes > 0 and path.stat().st_size > args.chunk_threshold_bytes
            queued_status = "needs_chunking" if oversized else "pending"
            row = connection.execute("SELECT source_hash, status FROM tasks WHERE source_path = ?", (relative,)).fetchone()
            if row is None:
                connection.execute(
                    "INSERT INTO tasks(source_path, source_hash, status, updated_at) VALUES (?, ?, ?, ?)",
                    (relative, digest, queued_status, stamp()),
                )
                event(connection, relative, "discovered", {"source_hash": digest, "status": queued_status})
                inserted += 1
            elif row["source_hash"] != digest:
                if row["status"] in {"leased", "failing", "reclaiming", "ready", "integrating", "chunked"}:
                    connection.execute(
                        "UPDATE tasks SET last_error = 'source changed while task active', updated_at = ? WHERE source_path = ?",
                        (stamp(), relative),
                    )
                    event(connection, relative, "source_change_deferred", {"old_hash": row["source_hash"], "new_hash": digest, "status": row["status"]})
                else:
                    connection.execute(
                        """UPDATE tasks SET source_hash = ?, status = ?, attempts = 0,
                           worker_id = NULL, lease_id = NULL, lease_expires_at = NULL,
                           retry_after = NULL, commit_sha = NULL, report_json = NULL,
                           worktree_path = NULL, branch = NULL, initial_target_path = NULL, claim_base_commit = NULL,
                           integration_commit = NULL, last_error = 'source changed', updated_at = ?
                           WHERE source_path = ?""",
                        (digest, queued_status, stamp(), relative),
                    )
                    event(connection, relative, "source_changed", {
                        "old_hash": row["source_hash"], "new_hash": digest, "status": queued_status,
                    })
                changed += 1
            else:
                if oversized and row["status"] == "pending":
                    connection.execute(
                        "UPDATE tasks SET status = 'needs_chunking', updated_at = ? WHERE source_path = ?",
                        (stamp(), relative),
                    )
                    event(connection, relative, "large_source_detected", {
                        "bytes": path.stat().st_size, "threshold": args.chunk_threshold_bytes,
                    })
                unchanged += 1
        active_rows = connection.execute("SELECT source_path, status FROM tasks WHERE status != 'obsolete'").fetchall()
        for active_row in active_rows:
            relative = active_row["source_path"]
            if relative not in seen:
                if active_row["status"] in {"leased", "failing", "reclaiming", "ready", "integrating", "chunked"}:
                    connection.execute("UPDATE tasks SET last_error = 'source removed while task active', updated_at = ? WHERE source_path = ?", (stamp(), relative))
                    event(connection, relative, "source_removal_deferred", {"status": active_row["status"]})
                else:
                    connection.execute(
                        "UPDATE tasks SET status = 'obsolete', lease_id = NULL, lease_expires_at = NULL, updated_at = ? WHERE source_path = ?",
                        (stamp(), relative),
                    )
                    event(connection, relative, "source_removed")
        connection.execute("COMMIT")
    except Exception:
        connection.execute("ROLLBACK")
        raise
    return emit({"ok": True, "source_root": str(root), "inserted": inserted, "changed": changed, "unchanged": unchanged, "total_seen": len(seen)})


def command_set_priority(args) -> int:
    """Raise or adjust one task's queue priority; claim order is priority DESC."""
    query = args.source.strip()
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    try:
        rows = connection.execute("SELECT source_path, status, priority, retry_after FROM tasks").fetchall()
        match = None
        for candidates in (
            [row for row in rows if row["source_path"] == query],
            [row for row in rows if row["source_path"].endswith("/" + query)],
            [row for row in rows if query in row["source_path"]],
        ):
            if not candidates:
                continue
            if len(candidates) > 1:
                connection.execute("ROLLBACK")
                return emit({
                    "ok": False,
                    "error": "source matches multiple tasks",
                    "candidates": [row["source_path"] for row in candidates],
                }, 2)
            match = candidates[0]
            break
        if match is None:
            connection.execute("ROLLBACK")
            return emit({"ok": False, "error": "no task matches source", "source": query}, 2)
        if match["status"] in {"merged", "obsolete"}:
            connection.execute("ROLLBACK")
            return emit({
                "ok": False,
                "error": f"task is {match['status']}; priority cannot affect it",
                "source_path": match["source_path"],
            }, 2)
        if args.reset:
            mode, priority_after = "reset", 0
        elif args.to is not None:
            mode, priority_after = "set", args.to
        elif args.raise_by is not None:
            mode, priority_after = "raise", match["priority"] + args.raise_by
        else:
            top = connection.execute(
                "SELECT MAX(priority) AS top FROM tasks WHERE status IN ('pending', 'failed')"
            ).fetchone()["top"] or 0
            mode, priority_after = "top", top + 1
        detail = {"mode": mode, "priority_before": match["priority"], "priority_after": priority_after}
        if mode == "top" and match["status"] == "failed" and match["retry_after"] and match["retry_after"] > stamp():
            connection.execute("UPDATE tasks SET retry_after = NULL WHERE source_path = ?", (match["source_path"],))
            detail["retry_after_cleared"] = True
        connection.execute(
            "UPDATE tasks SET priority = ?, updated_at = ? WHERE source_path = ?",
            (priority_after, stamp(), match["source_path"]),
        )
        event(connection, match["source_path"], "priority_changed", detail)
        connection.execute("COMMIT")
    except Exception:
        connection.execute("ROLLBACK")
        raise
    payload = {"ok": True, "source_path": match["source_path"], "status": match["status"], **detail}
    if match["status"] not in {"pending", "failed"}:
        payload["note"] = f"status is {match['status']}; priority applies once the task returns to pending or failed"
    return emit(payload)


def release_failed_claim(connection: sqlite3.Connection, source_path: str, lease_id: str, error: str) -> None:
    connection.execute("BEGIN IMMEDIATE")
    connection.execute(
        """UPDATE tasks SET status = 'pending', worker_id = NULL, lease_id = NULL,
           lease_expires_at = NULL, worktree_path = NULL, branch = NULL,
           last_error = ?, updated_at = ? WHERE source_path = ? AND lease_id = ?""",
        (error, stamp(), source_path, lease_id),
    )
    event(connection, source_path, "claim_setup_failed", {"lease_id": lease_id, "error": error})
    connection.execute("COMMIT")


def command_claim(args) -> int:
    source_root = args.source_root.resolve()
    target_repo = args.target_repo.resolve()
    worktree_root = args.worktree_root.resolve()
    dirty_base = non_generated_changes(target_repo)
    if dirty_base and not args.allow_dirty_base:
        return emit({
            "ok": False,
            "error": "target repository has non-generated uncommitted changes; claim refused",
            "changes": dirty_base,
        }, 2)
    connection = connect(args.database)
    current = stamp()
    connection.execute("BEGIN IMMEDIATE")
    eligible_sql = """SELECT * FROM tasks
       WHERE status = 'pending'
          OR (status = 'failed' AND worktree_path IS NULL AND attempts < ? AND (retry_after IS NULL OR retry_after <= ?))
       ORDER BY priority DESC, attempts ASC, source_path ASC"""
    row = None
    skipped = set()
    while True:
        candidates = connection.execute(eligible_sql, (args.max_attempts, current)).fetchall()
        candidate = next((item for item in candidates if item["source_path"] not in skipped), None)
        if candidate is None:
            break
        parents = unfinished_dependencies(connection, candidate["source_path"], source_root, target_repo)
        if parents:
            raise_dependency_priorities(connection, candidate["source_path"], parents)
            skipped.add(candidate["source_path"])
            continue
        row = candidate
        break
    if row is None:
        connection.execute("COMMIT")
        if skipped:
            return emit({"ok": True, "status": "waiting_dependencies", "sources": sorted(skipped)}, 3)
        return emit({"ok": True, "status": "empty", "message": "EMPTY_QUEUE"}, 3)
    lease_id = uuid.uuid4().hex
    branch = f"auto-translate/{lease_id[:12]}"
    worktree = worktree_root / lease_id[:12]
    expires = now() + dt.timedelta(minutes=args.lease_minutes)
    hard_expires = now() + dt.timedelta(hours=args.max_lease_hours)
    connection.execute(
        """UPDATE tasks SET status = 'leased', attempts = attempts + 1, worker_id = ?, lease_id = ?,
           lease_expires_at = ?, lease_started_at = ?, lease_hard_expires_at = ?,
           worktree_path = ?, branch = ?, last_error = NULL, updated_at = ?
           WHERE source_path = ?""",
        (args.worker_id, lease_id, stamp(expires), current, stamp(hard_expires),
         str(worktree), branch, current, row["source_path"]),
    )
    event(connection, row["source_path"], "claimed", {"lease_id": lease_id, "worker_id": args.worker_id, "expires_at": stamp(expires)})
    connection.execute("COMMIT")

    source = source_root / row["source_path"]
    if not source.is_file() or hash_file(source) != row["source_hash"]:
        release_failed_claim(connection, row["source_path"], lease_id, "source missing or changed after sync")
        return emit({"ok": False, "error": "source missing or changed; run sync"}, 2)
    if not args.no_worktree:
        try:
            if worktree.exists():
                raise RuntimeError(f"worktree path already exists: {worktree}")
            worktree_root.mkdir(parents=True, exist_ok=True)
            git_ok(target_repo, "worktree", "add", "-b", branch, str(worktree), args.base_ref)
            shared_modules = target_repo / "node_modules"
            if shared_modules.is_dir() and not (worktree / "node_modules").exists():
                (worktree / "node_modules").symlink_to(shared_modules, target_is_directory=True)
            claim_base_commit = git_ok(worktree, "rev-parse", "HEAD")
            initial_target = find_existing_target(source, row["source_path"], worktree)
            connection.execute("BEGIN IMMEDIATE")
            current = leased_task(connection, lease_id, allow_expired=True)
            if current is None:
                connection.execute("ROLLBACK")
                raise RuntimeError("lease disappeared during worktree setup")
            connection.execute(
                "UPDATE tasks SET initial_target_path = ?, claim_base_commit = ?, updated_at = ? WHERE lease_id = ?",
                (initial_target, claim_base_commit, stamp(), lease_id),
            )
            connection.execute("COMMIT")
        except Exception as exc:
            cleanup_worktree(target_repo, str(worktree), branch)
            release_failed_claim(connection, row["source_path"], lease_id, str(exc))
            return emit({"ok": False, "error": str(exc)}, 2)
    else:
        try:
            claim_base_commit = git_ok(target_repo, "rev-parse", "HEAD")
            initial_target = find_existing_target(source, row["source_path"], target_repo)
        except Exception as exc:
            release_failed_claim(connection, row["source_path"], lease_id, str(exc))
            return emit({"ok": False, "error": str(exc)}, 2)
        connection.execute("UPDATE tasks SET initial_target_path = ?, claim_base_commit = ?, updated_at = ? WHERE lease_id = ?", (initial_target, claim_base_commit, stamp(), lease_id))
    payload = {
        "ok": True,
        "status": "leased",
        "lease_id": lease_id,
        "lease_expires_at": stamp(expires),
        "lease_hard_expires_at": stamp(hard_expires),
        "worker_id": args.worker_id,
        "source": str(source),
        "source_root": str(source_root),
        "source_relative": row["source_path"],
        "source_hash": row["source_hash"],
        "target_root": str(worktree if not args.no_worktree else target_repo),
        "worktree": None if args.no_worktree else str(worktree),
        "branch": None if args.no_worktree else branch,
        "initial_target": initial_target,
        "claim_base_commit": claim_base_commit,
    }
    return emit(payload)


def leased_task(connection: sqlite3.Connection, lease_id: str, allow_expired: bool = False) -> sqlite3.Row | None:
    row = connection.execute("SELECT * FROM tasks WHERE lease_id = ? AND status = 'leased'", (lease_id,)).fetchone()
    if row is None:
        return None
    if not allow_expired and row["lease_expires_at"] and row["lease_expires_at"] <= stamp():
        return None
    return row


def command_heartbeat(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    row = leased_task(connection, args.lease_id)
    if row is None:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "active lease not found"}, 2)
    requested = now() + dt.timedelta(minutes=args.lease_minutes)
    hard_expires = dt.datetime.fromisoformat(row["lease_hard_expires_at"]) if row["lease_hard_expires_at"] else requested
    expires = min(requested, hard_expires)
    if expires <= now():
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "hard lease limit reached"}, 2)
    connection.execute("UPDATE tasks SET lease_expires_at = ?, updated_at = ? WHERE lease_id = ?", (stamp(expires), stamp(), args.lease_id))
    event(connection, row["source_path"], "heartbeat", {"lease_id": args.lease_id, "expires_at": stamp(expires)})
    connection.execute("COMMIT")
    return emit({"ok": True, "lease_id": args.lease_id, "lease_expires_at": stamp(expires)})


def validate_resumable_lease(args, row: sqlite3.Row) -> list[str]:
    errors = []
    if row["worker_id"] != args.worker_id:
        errors.append("worker_id does not own this lease")
    source = args.source_root.resolve() / row["source_path"]
    if not source.is_file() or hash_file(source) != row["source_hash"]:
        errors.append("source is missing or changed")
    if not row["worktree_path"] or not Path(row["worktree_path"]).is_dir():
        errors.append("leased worktree is missing")
    elif row["branch"]:
        worktree = Path(row["worktree_path"])
        branch = run_git(worktree, "symbolic-ref", "--quiet", "--short", "HEAD")
        if branch.returncode or branch.stdout.strip() != row["branch"]:
            errors.append("leased worktree is not on the recorded branch")
        elif row["claim_base_commit"] and run_git(worktree, "merge-base", "--is-ancestor", row["claim_base_commit"], "HEAD").returncode:
            errors.append("leased worktree HEAD no longer descends from the claimed base")
    return errors


def command_resume_lease(args) -> int:
    """Safely revive an expired lease which has not been reclaimed or replaced."""
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    row = connection.execute(
        "SELECT * FROM tasks WHERE lease_id = ? AND status = 'leased'", (args.lease_id,),
    ).fetchone()
    if row is None:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "leased task not found or already reclaimed"}, 2)
    errors = validate_resumable_lease(args, row)
    if errors:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "errors": errors}, 2)
    current = now()
    hard_expires = current + dt.timedelta(hours=args.max_lease_hours)
    expires = min(current + dt.timedelta(minutes=args.lease_minutes), hard_expires)
    connection.execute(
        """UPDATE tasks SET lease_expires_at = ?, lease_started_at = ?, lease_hard_expires_at = ?,
           updated_at = ?, last_error = NULL WHERE lease_id = ? AND status = 'leased'""",
        (stamp(expires), stamp(current), stamp(hard_expires), stamp(current), args.lease_id),
    )
    event(connection, row["source_path"], "lease_resumed", {
        "lease_id": args.lease_id, "worker_id": args.worker_id, "expires_at": stamp(expires),
        "hard_expires_at": stamp(hard_expires),
    })
    connection.execute("COMMIT")
    return emit({
        "ok": True, "status": "leased", "source_path": row["source_path"],
        "lease_id": args.lease_id, "lease_expires_at": stamp(expires),
        "lease_hard_expires_at": stamp(hard_expires),
    })


def command_keepalive(args) -> int:
    """Continuously renew one lease; intended to run as a worker sidecar."""
    while True:
        connection = connect(args.database)
        row = connection.execute(
            "SELECT status, lease_expires_at, lease_hard_expires_at FROM tasks WHERE lease_id = ?",
            (args.lease_id,),
        ).fetchone()
        connection.close()
        if row is None or row["status"] != "leased":
            return emit({"ok": True, "status": "stopped", "reason": "lease no longer active"})
        sleep_seconds = max(1, args.interval_seconds)
        time.sleep(sleep_seconds)
        heartbeat_args = argparse.Namespace(
            database=args.database, lease_id=args.lease_id, lease_minutes=args.lease_minutes,
        )
        result = command_heartbeat(heartbeat_args)
        if result:
            return result


def command_fail(args) -> int:
    connection = connect(args.database)
    connection.execute("BEGIN IMMEDIATE")
    row = leased_task(connection, args.lease_id)
    if row is None:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "active lease not found"}, 2)
    connection.execute("UPDATE tasks SET status = 'failing', updated_at = ? WHERE source_path = ?", (stamp(), row["source_path"]))
    connection.execute("COMMIT")
    cleanup_errors = cleanup_worktree(args.target_repo.resolve(), row["worktree_path"], row["branch"])
    terminal = row["attempts"] >= args.max_attempts or args.blocked or bool(cleanup_errors)
    status = "blocked" if terminal else "failed"
    retry_after = None if terminal else stamp(now() + dt.timedelta(minutes=args.retry_minutes))
    reason = args.reason if not cleanup_errors else args.reason + "; cleanup failed: " + "; ".join(cleanup_errors)
    connection.execute("BEGIN IMMEDIATE")
    current = connection.execute("SELECT lease_id, status FROM tasks WHERE source_path = ?", (row["source_path"],)).fetchone()
    if current is None or current["status"] != "failing" or current["lease_id"] != args.lease_id:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "lease changed during failure cleanup"}, 2)
    connection.execute(
        """UPDATE tasks SET status = ?, lease_id = NULL, lease_expires_at = NULL,
           retry_after = ?, last_error = ?, worktree_path = NULL, branch = NULL,
           initial_target_path = NULL, claim_base_commit = NULL, updated_at = ? WHERE source_path = ?""",
        (status, retry_after, reason, stamp(), row["source_path"]),
    )
    event(connection, row["source_path"], status, {"lease_id": args.lease_id, "reason": reason})
    connection.execute("COMMIT")
    return emit({"ok": True, "source_path": row["source_path"], "status": status, "retry_after": retry_after})


def require_report(report: dict) -> list[str]:
    errors = []
    if report.get("review", {}).get("result") != "PASS":
        errors.append("review.result must be PASS")
    analyser = report.get("analyser", {})
    if analyser.get("residual") != 0 or analyser.get("unresolved_paths") != 0:
        errors.append("analyser residual and unresolved_paths must both be 0")
    validation = report.get("validation", {})
    for key in REQUIRED_VALIDATION:
        if validation.get(key) != "PASS":
            errors.append(f"validation.{key} must be PASS")
    if not isinstance(report.get("target"), str) or not report["target"]:
        errors.append("target must be a non-empty path")
    if not isinstance(report.get("commit_sha"), str) or not report["commit_sha"]:
        errors.append("commit_sha must be non-empty")
    return errors


def commit_paths(worktree: Path, commit: str) -> list[tuple[str, ...]]:
    output = git_ok(worktree, "-c", "core.quotepath=false", "diff-tree", "--no-commit-id", "--name-status", "-M", "-r", commit)
    entries = []
    for line in output.splitlines():
        parts = tuple(line.split("\t"))
        entries.append(parts)
    return entries


def validate_commit_scope(entries: list[tuple[str, ...]], initial_target: str | None, final_target: str) -> list[str]:
    if any(any(path.startswith("_generated/") for path in entry[1:]) for entry in entries):
        return ["commit must not contain generated index files"]
    if initial_target and initial_target != final_target:
        if len(entries) == 1 and entries[0][0].startswith("R") and entries[0][1:] == (initial_target, final_target):
            return []
        if sorted(entries) == sorted([("D", initial_target), ("A", final_target)]):
            return []
        return ["commit must contain only the verified target rename"]
    allowed_status = {"A", "M"}
    if len(entries) != 1 or entries[0][0] not in allowed_status or entries[0][1:] != (final_target,):
        return ["commit must contain exactly the selected target JSON"]
    return []


def validate_target_identity(source: Path, target: Path, source_relative: str, target_relative: str) -> list[str]:
    errors = []
    source_rel = Path(source_relative)
    target_rel = Path(target_relative)
    if target_rel.parent != source_rel.parent or target_rel.suffix.lower() != ".json":
        errors.append("target must remain a JSON file in the selected source category")
    if "; " not in source_rel.name or "; " not in target_rel.name:
        errors.append("source and target filenames must use the '<作者>; <资源名>.json' form")
    elif source_rel.name.split("; ", 1)[0] != target_rel.name.split("; ", 1)[0]:
        errors.append("target filename must preserve the source author prefix byte-for-byte")
    if homebrew_identity(source) != homebrew_identity(target):
        errors.append("target _meta.sources[].json identity must equal the source identity")
    return errors


def command_complete(args) -> int:
    connection = connect(args.database)
    row = leased_task(connection, args.lease_id)
    if row is None:
        return emit({"ok": False, "error": "active lease not found"}, 2)
    report = json.loads(args.result.read_text(encoding="utf-8"))
    errors = require_report(report)
    source = args.source_root.resolve() / row["source_path"]
    if not source.is_file() or hash_file(source) != row["source_hash"]:
        errors.append("source changed while the task was leased")
    if report.get("source_hash") != row["source_hash"]:
        errors.append("report source_hash does not match the leased source")
    worktree = Path(row["worktree_path"]).resolve() if row["worktree_path"] else args.target_repo.resolve()
    dirty = non_generated_changes(worktree)
    if dirty:
        errors.append("leased worktree has non-generated uncommitted changes: " + ", ".join(dirty))
    target = Path(report.get("target", ""))
    target = target.resolve() if target.is_absolute() else (worktree / target).resolve()
    try:
        target_relative = target.relative_to(worktree).as_posix()
    except ValueError:
        target_relative = ""
        errors.append("target is outside the leased worktree")
    if not target.is_file():
        errors.append("reported target does not exist")
    elif target_relative:
        errors.extend(validate_target_identity(source, target, row["source_path"], target_relative))
    commit = report.get("commit_sha", "")
    if commit:
        verify = run_git(worktree, "rev-parse", "--verify", f"{commit}^{{commit}}")
        if verify.returncode:
            errors.append("commit_sha is not a commit in the leased worktree")
        elif git_ok(worktree, "rev-parse", "HEAD") != verify.stdout.strip():
            errors.append("commit_sha must be the leased worktree HEAD")
        else:
            parents = git_ok(worktree, "rev-list", "--parents", "-n", "1", commit).split()
            if len(parents) != 2 or parents[1] != row["claim_base_commit"]:
                errors.append("worker must produce exactly one commit directly on the claimed base")
            entries = commit_paths(worktree, commit)
            errors.extend(validate_commit_scope(entries, row["initial_target_path"], target_relative))
    if errors:
        return emit({"ok": False, "errors": errors}, 2)
    connection.execute("BEGIN IMMEDIATE")
    current = leased_task(connection, args.lease_id)
    if current is None or current["source_hash"] != row["source_hash"]:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "error": "lease changed during completion"}, 2)
    connection.execute(
        """UPDATE tasks SET status = 'ready', target_path = ?, commit_sha = ?, report_json = ?,
           lease_id = NULL, lease_expires_at = NULL, updated_at = ? WHERE source_path = ?""",
        (target_relative, commit, json.dumps(report, ensure_ascii=False), stamp(), row["source_path"]),
    )
    event(connection, row["source_path"], "ready", {"commit_sha": commit, "target_path": target_relative})
    connection.execute("COMMIT")
    return emit({"ok": True, "status": "ready", "source_path": row["source_path"], "target_path": target_relative, "commit_sha": commit})


def command_reclaim(args) -> int:
    connection = connect(args.database)
    cutoff = stamp()
    rows = connection.execute(
        "SELECT * FROM tasks WHERE status = 'leased' AND lease_expires_at <= ?", (cutoff,)
    ).fetchall()
    results = []
    for row in rows:
        connection.execute("BEGIN IMMEDIATE")
        claimed = connection.execute(
            """UPDATE tasks SET status = 'reclaiming', updated_at = ?
               WHERE source_path = ? AND status = 'leased' AND lease_id = ? AND lease_expires_at <= ?""",
            (cutoff, row["source_path"], row["lease_id"], cutoff),
        )
        if claimed.rowcount != 1:
            connection.execute("ROLLBACK")
            continue
        connection.execute("COMMIT")
        cleanup_errors = cleanup_worktree(args.target_repo.resolve(), row["worktree_path"], row["branch"])
        status = "blocked" if row["attempts"] >= args.max_attempts or cleanup_errors else "failed"
        detail = {"lease_id": row["lease_id"], "worktree_path": row["worktree_path"], "branch": row["branch"]}
        if cleanup_errors:
            detail["cleanup_errors"] = cleanup_errors
        connection.execute("BEGIN IMMEDIATE")
        current = connection.execute("SELECT lease_id, status FROM tasks WHERE source_path = ?", (row["source_path"],)).fetchone()
        if current is None or current["status"] != "reclaiming" or current["lease_id"] != row["lease_id"]:
            connection.execute("ROLLBACK")
            continue
        connection.execute(
            """UPDATE tasks SET status = ?, lease_id = NULL, lease_expires_at = NULL,
               retry_after = ?, last_error = ?, worktree_path = NULL, branch = NULL,
               initial_target_path = NULL, claim_base_commit = NULL, updated_at = ? WHERE source_path = ?""",
            (status, None if status == "blocked" else cutoff,
             "lease expired" if not cleanup_errors else "lease expired; cleanup failed: " + "; ".join(cleanup_errors),
             cutoff, row["source_path"]),
        )
        event(connection, row["source_path"], "lease_expired", detail)
        connection.execute("COMMIT")
        results.append({"source_path": row["source_path"], "status": status, "cleanup_errors": cleanup_errors})
    return emit({"ok": True, "reclaimed": len(results), "results": results})


def renew_integration(connection: sqlite3.Connection, source_path: str, token: str, minutes: int) -> None:
    current = stamp()
    expires = stamp(now() + dt.timedelta(minutes=minutes))
    connection.execute("BEGIN IMMEDIATE")
    updated = connection.execute(
        """UPDATE tasks SET lease_expires_at = ?, updated_at = ?
           WHERE source_path = ? AND status = 'integrating' AND integration_token = ?
           AND lease_expires_at > ?""",
        (expires, current, source_path, token, current),
    )
    if updated.rowcount != 1:
        connection.execute("ROLLBACK")
        raise RuntimeError("integration ownership expired or changed")
    connection.execute("COMMIT")


def command_integrate(args) -> int:
    repo = args.target_repo.resolve()
    dirty_base = non_generated_changes(repo)
    if dirty_base:
        return emit({"ok": False, "error": "target repository has non-generated uncommitted changes; integration refused", "changes": dirty_base}, 2)
    connection = connect(args.database)
    reconciled_integration = False
    for interrupted in connection.execute("SELECT * FROM tasks WHERE status = 'integrating'").fetchall():
        integrated = interrupted["integration_commit"] and run_git(repo, "merge-base", "--is-ancestor", interrupted["integration_commit"], "HEAD").returncode == 0
        expired = not interrupted["lease_expires_at"] or interrupted["lease_expires_at"] <= stamp()
        if not integrated and not expired:
            continue
        connection.execute("BEGIN IMMEDIATE")
        if integrated:
            connection.execute(
                """UPDATE tasks SET status = 'merged', commit_sha = ?, integration_commit = NULL,
                   integration_token = NULL, integration_base = NULL, lease_expires_at = NULL,
                   retry_after = NULL, updated_at = ? WHERE source_path = ? AND status = 'integrating'""",
                (interrupted["integration_commit"], stamp(), interrupted["source_path"]),
            )
            event(connection, interrupted["source_path"], "integration_reconciled", {"integration_commit": interrupted["integration_commit"]})
        else:
            connection.execute(
                """UPDATE tasks SET status = 'ready', integration_commit = NULL, integration_token = NULL,
                   integration_base = NULL, lease_expires_at = NULL, retry_after = ?,
                   last_error = 'expired integration recovered', updated_at = ?
                   WHERE source_path = ? AND status = 'integrating'""",
                (stamp(now() + dt.timedelta(minutes=args.retry_minutes)), stamp(), interrupted["source_path"]),
            )
            event(connection, interrupted["source_path"], "integration_requeued")
        connection.execute("COMMIT")
        if integrated:
            cleanup_worktree(repo, interrupted["worktree_path"], interrupted["branch"])
            reconciled_integration = True
    integration_token = uuid.uuid4().hex
    integration_expires = stamp(now() + dt.timedelta(minutes=args.integration_lease_minutes))
    base_head = git_ok(repo, "rev-parse", "HEAD")
    connection.execute("BEGIN IMMEDIATE")
    row = connection.execute(
        """SELECT * FROM tasks WHERE status = 'ready' AND (retry_after IS NULL OR retry_after <= ?)
           ORDER BY updated_at, source_path LIMIT 1""",
        (stamp(),),
    ).fetchone()
    if row is None:
        connection.execute("COMMIT")
        cleanup = cleanup_excess_worktrees(repo, args.worktree_root, connection) if reconciled_integration else {"removed": [], "errors": []}
        return emit({"ok": True, "status": "empty", "message": "NO_READY_TASK", "worktree_cleanup": cleanup}, 3)
    connection.execute(
        """UPDATE tasks SET status = 'integrating', integration_token = ?, integration_base = ?,
           lease_expires_at = ?, integration_commit = NULL, updated_at = ?
           WHERE source_path = ? AND status = 'ready'""",
        (integration_token, base_head, integration_expires, stamp(), row["source_path"]),
    )
    event(connection, row["source_path"], "integration_claimed", {"token": integration_token, "base": base_head})
    connection.execute("COMMIT")
    live_source = args.source_root.resolve() / row["source_path"]
    live_hash = hash_file(live_source) if live_source.is_file() else None
    if live_hash != row["source_hash"]:
        cleanup_errors = cleanup_worktree(repo, row["worktree_path"], row["branch"])
        next_status = "pending" if live_hash and not cleanup_errors else "blocked" if cleanup_errors else "obsolete"
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            """UPDATE tasks SET source_hash = COALESCE(?, source_hash), status = ?, attempts = 0,
               worktree_path = NULL, branch = NULL, commit_sha = NULL, report_json = NULL,
               target_path = NULL, initial_target_path = NULL, claim_base_commit = NULL, integration_commit = NULL,
               integration_token = NULL, integration_base = NULL, lease_expires_at = NULL,
               retry_after = NULL, last_error = ?, updated_at = ? WHERE source_path = ?
               AND status = 'integrating' AND integration_token = ?""",
            (live_hash, next_status,
             "source changed before integration" if not cleanup_errors else "stale worktree cleanup failed: " + "; ".join(cleanup_errors),
             stamp(), row["source_path"], integration_token),
        )
        event(connection, row["source_path"], "ready_source_changed", {"new_hash": live_hash, "status": next_status, "cleanup_errors": cleanup_errors})
        connection.execute("COMMIT")
        return emit({"ok": False, "status": next_status, "source_path": row["source_path"], "error": "source changed before integration", "cleanup_errors": cleanup_errors}, 2)
    integration_id = uuid.uuid4().hex[:12]
    integration_branch = f"auto-integrate/{integration_id}"
    integration_worktree = args.worktree_root.resolve() / f"integration-{integration_id}"
    phase = "setup"
    try:
        args.worktree_root.resolve().mkdir(parents=True, exist_ok=True)
        git_ok(repo, "worktree", "add", "-b", integration_branch, str(integration_worktree), base_head)
        shared_modules = repo / "node_modules"
        if shared_modules.is_dir() and not (integration_worktree / "node_modules").exists():
            (integration_worktree / "node_modules").symlink_to(shared_modules, target_is_directory=True)
        renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
        with tempfile.NamedTemporaryFile(prefix="homebrew-source-snapshot-", suffix=".json") as source_snapshot, tempfile.NamedTemporaryFile(prefix="homebrew-integration-baseline-", suffix=".json") as baseline:
            source_snapshot.write(live_source.read_bytes())
            source_snapshot.flush()
            phase = "baseline_tests"
            baseline_result = subprocess.run(
                [sys.executable, str(SCRIPT_DIR / "run_homebrew_tests.py"), "--capture-baseline", baseline.name, "--homebrew-dir", str(integration_worktree)],
                cwd=integration_worktree, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
            )
            if baseline_result.returncode:
                raise RuntimeError("could not capture integration test baseline\n" + baseline_result.stdout)
            renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
            phase = "candidate_cherry_pick"
            result = run_git(integration_worktree, "cherry-pick", row["commit_sha"])
            if result.returncode:
                phase = "candidate_conflict"
                raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "integration cherry-pick failed")
            renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
            source = Path(source_snapshot.name)
            target = integration_worktree / row["target_path"]
            validation_commands = (
                ["npm", "run", "build"],
                [sys.executable, str(SCRIPT_DIR / "compare_json_structure.py"), str(source), str(target), "--mode", "homebrew"],
                [sys.executable, str(SCRIPT_DIR / "compare_homebrew_schema.py"), str(source), str(target), "--homebrew-dir", str(integration_worktree)],
                [sys.executable, str(SCRIPT_DIR / "run_homebrew_tests.py"), "--baseline-report", baseline.name, "--homebrew-dir", str(integration_worktree)],
            )
            validation_results = []
            build_target_absorbed = False
            json.loads(target.read_text(encoding="utf-8-sig"))
            phase = "candidate_validation"
            for command in validation_commands:
                completed = subprocess.run(command, cwd=integration_worktree, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
                validation_results.append({"command": command, "exit_code": completed.returncode, "output": completed.stdout})
                if completed.returncode:
                    raise RuntimeError(f"integration validation failed: {' '.join(command)}\n{completed.stdout}")
                if command[:3] == ["npm", "run", "build"]:
                    build_target_absorbed = absorb_build_target_change(integration_worktree, row["target_path"])
                renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
            tested_commit = git_ok(integration_worktree, "rev-parse", "HEAD")
            if hash_file(live_source) != row["source_hash"]:
                raise RuntimeError("English source changed during integration validation")
            renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
            connection.execute("BEGIN IMMEDIATE")
            current = connection.execute("SELECT status, commit_sha, integration_token FROM tasks WHERE source_path = ?", (row["source_path"],)).fetchone()
            if current is None or current["status"] != "integrating" or current["integration_token"] != integration_token or current["commit_sha"] != row["commit_sha"]:
                connection.execute("ROLLBACK")
                raise RuntimeError("task changed during integration validation")
            connection.execute(
                "UPDATE tasks SET integration_commit = ?, updated_at = ? WHERE source_path = ? AND integration_token = ?",
                (tested_commit, stamp(), row["source_path"], integration_token),
            )
            event(connection, row["source_path"], "integrating", {
                "integration_commit": tested_commit,
                "build_target_absorbed": build_target_absorbed,
            })
            connection.execute("COMMIT")
            phase = "shared_fast_forward"
            renew_integration(connection, row["source_path"], integration_token, args.integration_lease_minutes)
            if hash_file(live_source) != row["source_hash"]:
                raise RuntimeError("English source changed before integration fast-forward")
            if git_ok(repo, "rev-parse", "HEAD") != base_head:
                raise RuntimeError("shared repository HEAD changed during integration validation")
            result = run_git(repo, "merge", "--ff-only", tested_commit)
            if result.returncode:
                raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "final fast-forward failed")
    except Exception as exc:
        connection.execute("BEGIN IMMEDIATE")
        status = "blocked" if phase == "candidate_conflict" else "ready"
        retry_after = None if status == "blocked" else stamp(now() + dt.timedelta(minutes=args.retry_minutes))
        updated = connection.execute(
            """UPDATE tasks SET status = ?, integration_commit = NULL, integration_token = NULL,
               integration_base = NULL, lease_expires_at = NULL, retry_after = ?, last_error = ?, updated_at = ?
               WHERE source_path = ? AND status = 'integrating' AND integration_token = ?""",
            (status, retry_after, str(exc), stamp(), row["source_path"], integration_token),
        )
        if updated.rowcount:
            event(connection, row["source_path"], "integration_blocked" if status == "blocked" else "integration_retry", {"phase": phase, "error": str(exc)})
        connection.execute("COMMIT")
        result_status = status if updated.rowcount else "ownership_lost"
        exit_code = 4 if result_status == "ready" else 2
        return emit({"ok": False, "status": result_status, "source_path": row["source_path"], "phase": phase, "error": str(exc), "retry_after": retry_after}, exit_code)
    finally:
        if integration_worktree.exists():
            run_git(repo, "worktree", "remove", "--force", str(integration_worktree))
        run_git(repo, "branch", "-D", integration_branch)
    integrated_commit = git_ok(repo, "rev-parse", "HEAD")
    connection.execute("BEGIN IMMEDIATE")
    updated = connection.execute(
        """UPDATE tasks SET status = 'merged', commit_sha = ?, integration_commit = NULL,
           integration_token = NULL, integration_base = NULL, lease_expires_at = NULL,
           retry_after = NULL, updated_at = ? WHERE source_path = ? AND status = 'integrating'
           AND integration_token = ?""",
        (integrated_commit, stamp(), row["source_path"], integration_token),
    )
    if updated.rowcount != 1:
        connection.execute("ROLLBACK")
        return emit({"ok": False, "status": "reconcile_required", "source_path": row["source_path"], "commit_sha": integrated_commit}, 2)
    event(connection, row["source_path"], "merged", {"worker_commit": row["commit_sha"], "integrated_commit": integrated_commit})
    connection.execute("COMMIT")
    cleanup_errors = cleanup_worktree(repo, row["worktree_path"], row["branch"])
    worktree_cleanup = cleanup_excess_worktrees(repo, args.worktree_root, connection)
    return emit({"ok": True, "status": "merged", "source_path": row["source_path"], "commit_sha": integrated_commit, "revalidated": ["json", "build", "structure", "schema", "tests"], "build_target_absorbed": build_target_absorbed, "cleanup_errors": cleanup_errors, "worktree_cleanup": worktree_cleanup})


def command_status(args) -> int:
    connection = connect(args.database)
    counts = {row["status"]: row["count"] for row in connection.execute("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status")}
    tasks = [dict(row) for row in connection.execute(
        "SELECT source_path, status, priority, attempts, worker_id, lease_expires_at, target_path, commit_sha, last_error, updated_at FROM tasks ORDER BY status, priority DESC, source_path"
    )]
    return emit({"ok": True, "counts": counts, "tasks": tasks if args.all else tasks[: args.limit], "truncated": not args.all and len(tasks) > args.limit})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=DEFAULT_STATE_DIR / "queue.sqlite3")
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--target-repo", type=Path, default=DEFAULT_TARGET_REPO)
    parser.add_argument("--worktree-root", type=Path, default=DEFAULT_WORKTREE_ROOT)
    sub = parser.add_subparsers(dest="command", required=True)

    sync = sub.add_parser("sync")
    sync.add_argument("--chunk-threshold-bytes", type=int, default=250000)
    sync.set_defaults(func=command_sync)

    priority = sub.add_parser("set-priority", help="Raise one task above the queue or adjust its priority")
    priority.add_argument("--source", required=True, help="exact source_path, unique suffix, or unique substring")
    priority_mode = priority.add_mutually_exclusive_group()
    priority_mode.add_argument("--to", type=int, help="absolute priority; higher is claimed sooner")
    priority_mode.add_argument("--raise-by", type=int, help="relative adjustment; negative lowers")
    priority_mode.add_argument("--reset", action="store_true", help="restore the default priority 0")
    priority.set_defaults(func=command_set_priority)

    claim = sub.add_parser("claim")
    claim.add_argument("--worker-id", required=True)
    claim.add_argument("--lease-minutes", type=int, default=30)
    claim.add_argument("--max-lease-hours", type=int, default=12)
    claim.add_argument("--max-attempts", type=int, default=3)
    claim.add_argument("--base-ref", default="HEAD")
    claim.add_argument("--no-worktree", action="store_true")
    claim.add_argument("--allow-dirty-base", action="store_true", help="Unsafe escape hatch for a deliberately isolated base")
    claim.set_defaults(func=command_claim)

    heartbeat = sub.add_parser("heartbeat")
    heartbeat.add_argument("--lease-id", required=True)
    heartbeat.add_argument("--lease-minutes", type=int, default=30)
    heartbeat.set_defaults(func=command_heartbeat)

    resume = sub.add_parser("resume-lease")
    resume.add_argument("--lease-id", required=True)
    resume.add_argument("--worker-id", required=True)
    resume.add_argument("--lease-minutes", type=int, default=30)
    resume.add_argument("--max-lease-hours", type=int, default=12)
    resume.set_defaults(func=command_resume_lease)

    keepalive = sub.add_parser("keepalive")
    keepalive.add_argument("--lease-id", required=True)
    keepalive.add_argument("--interval-seconds", type=int, default=300)
    keepalive.add_argument("--lease-minutes", type=int, default=30)
    keepalive.set_defaults(func=command_keepalive)

    fail = sub.add_parser("fail")
    fail.add_argument("--lease-id", required=True)
    fail.add_argument("--reason", required=True)
    fail.add_argument("--retry-minutes", type=int, default=15)
    fail.add_argument("--max-attempts", type=int, default=3)
    fail.add_argument("--blocked", action="store_true")
    fail.set_defaults(func=command_fail)

    complete = sub.add_parser("complete")
    complete.add_argument("--lease-id", required=True)
    complete.add_argument("--result", type=Path, required=True)
    complete.set_defaults(func=command_complete)

    reclaim = sub.add_parser("reclaim-expired")
    reclaim.add_argument("--max-attempts", type=int, default=3)
    reclaim.set_defaults(func=command_reclaim)

    integrate = sub.add_parser("integrate-next")
    integrate.add_argument("--retry-minutes", type=int, default=15)
    integrate.add_argument("--integration-lease-minutes", type=int, default=60)
    integrate.set_defaults(func=command_integrate)

    status = sub.add_parser("status")
    status.add_argument("--limit", type=int, default=50)
    status.add_argument("--all", action="store_true")
    status.set_defaults(func=command_status)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        return args.func(args)
    except (OSError, RuntimeError, sqlite3.Error, json.JSONDecodeError) as exc:
        return emit({"ok": False, "error": str(exc)}, 2)


if __name__ == "__main__":
    raise SystemExit(main())
