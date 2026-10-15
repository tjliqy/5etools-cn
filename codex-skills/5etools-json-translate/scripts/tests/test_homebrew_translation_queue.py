import json
import importlib.util
import sqlite3
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "homebrew_translation_queue.py"
SPEC = importlib.util.spec_from_file_location("homebrew_translation_queue", SCRIPT)
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


class QueueIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "source"
        self.repo = self.root / "target"
        self.worktrees = self.root / "worktrees"
        self.database = self.root / "state" / "queue.sqlite3"
        (self.source / "collection").mkdir(parents=True)
        self.repo.mkdir()
        self._git("init")
        self._git("config", "user.email", "queue-test@example.invalid")
        self._git("config", "user.name", "Queue Test")
        (self.repo / "package.json").write_text('{"scripts": {}}\n', encoding="utf-8")
        self._git("add", "package.json")
        self._git("commit", "-m", "base")

    def tearDown(self):
        subprocess.run(["git", "-C", str(self.repo), "worktree", "prune"], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.temporary.cleanup()

    def _git(self, *args):
        return subprocess.run(["git", "-C", str(self.repo), *args], check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()

    def _queue(self, *args, expected=0):
        command = [
            "python3", str(SCRIPT),
            "--database", str(self.database),
            "--source-root", str(self.source),
            "--target-repo", str(self.repo),
            "--worktree-root", str(self.worktrees),
            *args,
        ]
        completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertEqual(completed.returncode, expected, completed.stdout + completed.stderr)
        return json.loads(completed.stdout)

    def _claim_one(self, lease_minutes=30):
        source = self.source / "collection" / "A; One.json"
        source.write_text('{"_meta":{"sources":[{"json":"One"}]},"item":[]}\n', encoding="utf-8")
        self._queue("sync")
        return self._queue("claim", "--worker-id", "worker-a", "--lease-minutes", str(lease_minutes))

    def _commit_and_report(self, claim, include_extra=False, include_generated=False, dirty_after=False):
        worktree = Path(claim["worktree"])
        target = worktree / "collection" / "A; 一.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text('{"_meta":{"sources":[{"json":"One"}]},"item":[]}\n', encoding="utf-8")
        paths = [target]
        if include_extra:
            extra = worktree / "collection" / "Unrelated.json"
            extra.write_text("{}\n", encoding="utf-8")
            paths.append(extra)
        if include_generated:
            generated = worktree / "_generated" / "index-meta.json"
            generated.parent.mkdir(parents=True, exist_ok=True)
            generated.write_text("{}\n", encoding="utf-8")
            paths.append(generated)
        subprocess.run(["git", "-C", str(worktree), "add", *(path.relative_to(worktree).as_posix() for path in paths)], check=True)
        subprocess.run(["git", "-C", str(worktree), "-c", "user.email=queue-test@example.invalid", "-c", "user.name=Queue Test", "commit", "-m", "translate"], check=True, stdout=subprocess.PIPE)
        commit = subprocess.run(["git", "-C", str(worktree), "rev-parse", "HEAD"], check=True, text=True, stdout=subprocess.PIPE).stdout.strip()
        if dirty_after:
            target.write_text('{"changed":true}\n', encoding="utf-8")
        report = {
            "source_hash": claim["source_hash"],
            "target": target.relative_to(worktree).as_posix(),
            "commit_sha": commit,
            "analyser": {"jobs": 1, "actionable": 1, "residual": 0, "unresolved_paths": 0},
            "review": {"rounds": 1, "result": "PASS"},
            "validation": {key: "PASS" for key in ("json", "structure", "schema", "build", "tests")},
        }
        report_path = self.root / f"result-{claim['lease_id']}.json"
        report_path.write_text(json.dumps(report), encoding="utf-8")
        return report_path

    def test_claims_are_distinct_and_completion_requires_validated_commit(self):
        first_source = self.source / "collection" / "A; One.json"
        second_source = self.source / "collection" / "B; Two.json"
        first_source.write_text('{"_meta":{"sources":[{"json":"One"}]},"item":[]}\n', encoding="utf-8")
        second_source.write_text('{"_meta":{"sources":[{"json":"Two"}]},"item":[]}\n', encoding="utf-8")
        synced = self._queue("sync")
        self.assertEqual(synced["inserted"], 2)

        first = self._queue("claim", "--worker-id", "worker-a")
        second = self._queue("claim", "--worker-id", "worker-b")
        self.assertNotEqual(first["lease_id"], second["lease_id"])
        self.assertNotEqual(first["source"], second["source"])

        report_path = self._commit_and_report(first)
        completed = self._queue("complete", "--lease-id", first["lease_id"], "--result", str(report_path))
        self.assertEqual(completed["status"], "ready")

        for claim in (first, second):
            subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", claim["worktree"]], check=True)

    def test_claim_prioritizes_untranslated_homebrew_dependencies(self):
        files = {
            "A; Main.json": {"sources": [{"json": "Main"}], "dependencies": {"item": ["Dep", "Official", "Done"]}},
            "B; Dep.json": {"sources": [{"json": "Dep"}]},
            "C; Other.json": {"sources": [{"json": "Other"}]},
            "D; Done.json": {"sources": [{"json": "Done"}]},
        }
        for name, meta in files.items():
            (self.source / "collection" / name).write_text(json.dumps({"_meta": meta}), encoding="utf-8")
        generated = self.source / "_generated"
        generated.mkdir()
        (generated / "index-sources.json").write_text(json.dumps({
            "Main": "collection/A; Main.json", "Dep": "collection/B; Dep.json",
            "Other": "collection/C; Other.json", "Done": "collection/D; Done.json",
        }), encoding="utf-8")
        target_generated = self.repo / "_generated"
        target_generated.mkdir()
        (target_generated / "index-sources.json").write_text(json.dumps({"Done": "collection/D; Done.json"}), encoding="utf-8")
        self._queue("sync")
        first = self._queue("claim", "--worker-id", "worker-a")
        self.assertEqual(first["source"], str(self.source / "collection/A; Main.json"))
        with sqlite3.connect(self.database) as connection:
            priorities = dict(connection.execute("SELECT source_path, priority FROM tasks"))
        self.assertGreater(priorities["collection/B; Dep.json"], priorities["collection/C; Other.json"])
        self.assertEqual(priorities["collection/D; Done.json"], 0)
        second = self._queue("claim", "--worker-id", "worker-b")
        self.assertEqual(second["source"], str(self.source / "collection/B; Dep.json"))
        for claim in (first, second):
            subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", claim["worktree"]], check=True)

    def test_sync_routes_large_sources_to_chunk_planning(self):
        source = self.source / "collection" / "A; Large.json"
        source.write_text('{"_meta":{"sources":[{"json":"Large"}]},"entries":["long"]}\n', encoding="utf-8")
        self._queue("sync", "--chunk-threshold-bytes", "1")
        with sqlite3.connect(self.database) as connection:
            status = connection.execute("SELECT status FROM tasks WHERE source_path = 'collection/A; Large.json'").fetchone()[0]
        self.assertEqual(status, "needs_chunking")
        empty = self._queue("claim", "--worker-id", "worker-a", expected=3)
        self.assertEqual(empty["message"], "EMPTY_QUEUE")

    def test_set_priority_default_raises_task_above_other_claimable_work(self):
        for filename, name in (("A; One.json", "One"), ("B; Two.json", "Two")):
            source = self.source / "collection" / filename
            source.write_text('{"_meta":{"sources":[{"json":"%s"}]},"item":[]}\n' % name, encoding="utf-8")
        self._queue("sync")
        raised = self._queue("set-priority", "--source", "B; Two.json")
        self.assertEqual(raised["mode"], "top")
        self.assertEqual(raised["priority_before"], 0)
        self.assertEqual(raised["priority_after"], 1)
        claim = self._queue("claim", "--worker-id", "worker-a")
        self.assertEqual(claim["source_relative"], "collection/B; Two.json")
        subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", claim["worktree"]], check=True)

    def test_set_priority_rejects_unknown_ambiguous_and_finished_tasks(self):
        unknown = self._queue("set-priority", "--source", "missing.json", expected=2)
        self.assertIn("no task", unknown["error"])
        for relative in ("alpha/A; Same.json", "beta/A; Same.json"):
            source = self.source / relative
            source.parent.mkdir(parents=True)
            source.write_text('{"_meta":{"sources":[{"json":"Same"}]},"item":[]}\n', encoding="utf-8")
        self._queue("sync")
        ambiguous = self._queue("set-priority", "--source", "A; Same.json", expected=2)
        self.assertEqual(ambiguous["candidates"], ["alpha/A; Same.json", "beta/A; Same.json"])
        with sqlite3.connect(self.database) as connection:
            connection.execute("UPDATE tasks SET status = 'merged' WHERE source_path = 'alpha/A; Same.json'")
        finished = self._queue("set-priority", "--source", "alpha/A; Same.json", expected=2)
        self.assertIn("merged", finished["error"])

    def test_set_priority_modes_and_event_log(self):
        source = self.source / "collection" / "A; One.json"
        source.write_text('{"_meta":{"sources":[{"json":"One"}]},"item":[]}\n', encoding="utf-8")
        self._queue("sync")
        self.assertEqual(self._queue("set-priority", "--source", "collection/A; One.json", "--to", "4")["priority_after"], 4)
        self.assertEqual(self._queue("set-priority", "--source", "A; One.json", "--raise-by", "-1")["priority_after"], 3)
        self.assertEqual(self._queue("set-priority", "--source", "A; One.json", "--reset")["priority_after"], 0)
        with sqlite3.connect(self.database) as connection:
            events = connection.execute(
                "SELECT COUNT(*) FROM events WHERE source_path = 'collection/A; One.json' AND event = 'priority_changed'"
            ).fetchone()[0]
        self.assertEqual(events, 3)

    def test_top_priority_clears_failed_retry_timer_for_immediate_reclaim(self):
        claim = self._claim_one()
        failed = self._queue("fail", "--lease-id", claim["lease_id"], "--reason", "transient", "--retry-minutes", "30")
        self.assertEqual(failed["status"], "failed")
        raised = self._queue("set-priority", "--source", "A; One.json")
        self.assertTrue(raised["retry_after_cleared"])
        reclaimed = self._queue("claim", "--worker-id", "worker-b")
        self.assertEqual(reclaimed["source_relative"], "collection/A; One.json")
        subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", reclaimed["worktree"]], check=True)

    def test_expired_lease_cannot_heartbeat_or_complete(self):
        claim = self._claim_one(lease_minutes=0)
        self._queue("heartbeat", "--lease-id", claim["lease_id"], expected=2)
        self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(self.root / "missing.json"), expected=2)
        self._queue("reclaim-expired")
        self.assertFalse(Path(claim["worktree"]).exists())

    def test_expired_lease_can_be_resumed_by_original_worker_before_reclaim(self):
        claim = self._claim_one(lease_minutes=0)
        resumed = self._queue(
            "resume-lease", "--lease-id", claim["lease_id"],
            "--worker-id", "worker-a", "--lease-minutes", "30",
        )
        self.assertEqual(resumed["status"], "leased")
        report = self._commit_and_report(claim)
        completed = self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(report))
        self.assertEqual(completed["status"], "ready")

    def test_expired_lease_cannot_be_resumed_by_another_worker(self):
        claim = self._claim_one(lease_minutes=0)
        result = self._queue(
            "resume-lease", "--lease-id", claim["lease_id"],
            "--worker-id", "worker-b", expected=2,
        )
        self.assertTrue(any("worker_id" in error for error in result["errors"]))
        self._queue("reclaim-expired")

    def test_completion_rejects_dirty_bytes_after_commit(self):
        claim = self._claim_one()
        report = self._commit_and_report(claim, dirty_after=True)
        result = self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(report), expected=2)
        self.assertTrue(any("uncommitted" in error for error in result["errors"]))
        self._queue("fail", "--lease-id", claim["lease_id"], "--reason", "test cleanup")

    def test_completion_rejects_second_json_in_same_category(self):
        claim = self._claim_one()
        report = self._commit_and_report(claim, include_extra=True)
        result = self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(report), expected=2)
        self.assertTrue(any("exactly" in error for error in result["errors"]))
        self._queue("fail", "--lease-id", claim["lease_id"], "--reason", "test cleanup")

    def test_completion_rejects_committed_generated_indexes(self):
        claim = self._claim_one()
        report = self._commit_and_report(claim, include_generated=True)
        result = self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(report), expected=2)
        self.assertTrue(any("generated" in error for error in result["errors"]))
        self._queue("fail", "--lease-id", claim["lease_id"], "--reason", "test cleanup")

    def test_completion_rejects_multiple_worker_commits(self):
        claim = self._claim_one()
        worktree = Path(claim["worktree"])
        target = worktree / "collection" / "A; 一.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text('{"first":true}\n', encoding="utf-8")
        subprocess.run(["git", "-C", str(worktree), "add", target.relative_to(worktree).as_posix()], check=True)
        subprocess.run(["git", "-C", str(worktree), "-c", "user.email=queue-test@example.invalid", "-c", "user.name=Queue Test", "commit", "-m", "partial"], check=True, stdout=subprocess.PIPE)
        report = self._commit_and_report(claim)
        result = self._queue("complete", "--lease-id", claim["lease_id"], "--result", str(report), expected=2)
        self.assertTrue(any("exactly one commit" in error for error in result["errors"]))
        self._queue("fail", "--lease-id", claim["lease_id"], "--reason", "test cleanup")

    def test_integration_reconciles_commit_already_in_shared_history(self):
        claim = self._claim_one()
        subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", claim["worktree"]], check=True)
        orphan = self.worktrees / "orphan-worker"
        self._git("worktree", "add", "-b", "auto-translate/orphan", str(orphan), "HEAD")
        head = self._git("rev-parse", "HEAD")
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                """UPDATE tasks SET status = 'integrating', lease_id = NULL,
                   integration_commit = ?, worktree_path = NULL, branch = NULL""",
                (head,),
            )
        result = self._queue("integrate-next", expected=3)
        self.assertEqual(result["message"], "NO_READY_TASK")
        self.assertEqual(result["worktree_cleanup"]["removed"], [str(orphan)])
        self.assertFalse(orphan.exists())
        with sqlite3.connect(self.database) as connection:
            status = connection.execute("SELECT status FROM tasks").fetchone()[0]
        self.assertEqual(status, "merged")

    def test_successful_reconciliation_preserves_active_and_non_worker_worktrees(self):
        claim = self._claim_one()
        active = Path(claim["worktree"])
        manual = self.root / "manual-proofread"
        self._git("worktree", "add", "-b", "proofread/manual", str(manual), "HEAD")
        head = self._git("rev-parse", "HEAD")
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                """INSERT INTO tasks(source_path, source_hash, status, integration_commit, updated_at)
                   VALUES ('collection/reconciled.json', 'hash', 'integrating', ?, 'now')""",
                (head,),
            )

        self._queue("integrate-next", expected=3)

        self.assertTrue(active.exists())
        self.assertTrue(manual.exists())

    def test_build_target_change_is_absorbed_into_candidate_commit(self):
        target = self.repo / "book" / "A; 一.json"
        generated = self.repo / "_generated" / "index.json"
        target.parent.mkdir(parents=True)
        generated.parent.mkdir(parents=True)
        target.write_text('{"value":"before"}\n', encoding="utf-8")
        generated.write_text('{}\n', encoding="utf-8")
        self._git("add", "book/A; 一.json", "_generated/index.json")
        self._git("commit", "-m", "candidate")

        target.write_text('{"value":"normalized"}\n', encoding="utf-8")
        generated.write_text('{"changed":true}\n', encoding="utf-8")

        self.assertTrue(QUEUE.absorb_build_target_change(self.repo, "book/A; 一.json"))
        self.assertEqual(self._git("show", "HEAD:book/A; 一.json"), '{"value":"normalized"}')
        self.assertEqual(QUEUE.non_generated_change_paths(self.repo), [])
        self.assertIn("_generated/index.json", self._git("status", "--short"))

    def test_build_change_outside_target_is_rejected(self):
        target = self.repo / "book" / "A; 一.json"
        other = self.repo / "book" / "B; 二.json"
        target.parent.mkdir(parents=True)
        target.write_text('{}\n', encoding="utf-8")
        other.write_text('{}\n', encoding="utf-8")
        self._git("add", "book/A; 一.json", "book/B; 二.json")
        self._git("commit", "-m", "candidate")
        target.write_text('{"changed":true}\n', encoding="utf-8")
        other.write_text('{"changed":true}\n', encoding="utf-8")

        with self.assertRaisesRegex(RuntimeError, "outside the selected target"):
            QUEUE.absorb_build_target_change(self.repo, "book/A; 一.json")


if __name__ == "__main__":
    unittest.main()
